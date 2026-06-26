import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { apiFetch, wsUrl } from "@/lib/api";
import type { TranscriptEntry, VoiceStatus } from "@/lib/types";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Encode raw Int16 PCM samples into a WAV blob */
function encodeWav(samples: Int16Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.byteLength);
  const view = new DataView(buffer);
  const ws = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  ws(0, "RIFF");
  view.setUint32(4, 36 + samples.byteLength, true);
  ws(8, "WAVE"); ws(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ws(36, "data");
  view.setUint32(40, samples.byteLength, true);
  new Uint8Array(buffer, 44).set(new Uint8Array(samples.buffer));
  return new Blob([buffer], { type: "audio/wav" });
}

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}

export interface HistoryEntry {
  id: string;
  date: string;          // ISO string
  incidentType: string;
  duration: string;      // e.g. "5m 12s"
  transcript: TranscriptEntry[];
  qrDataUrl: string;     // base64 PNG of QR code
  location: { lat: number; lng: number } | null;
}

export function useVoiceAgent() {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isPushingToTalk, setIsPushingToTalk] = useState(false);
  const [emailAlert, setEmailAlert] = useState<{ incidentType: string; sentTo: string[] } | null>(null);
  const [medicalPassQr, setMedicalPassQr] = useState<string | null>(null);
  const [incidentType, setIncidentType] = useState<string>("Emergency");
  const [vehicleDispatch, setVehicleDispatch] = useState<{
    vehicleType: "ambulance" | "fire" | "police";
    incidentType: string;
    userCoords: { lat: number; lng: number };
  } | null>(null);

  // ── refs ──────────────────────────────────────────────────────────────────
  const wsRef              = useRef<WebSocket | null>(null);
  const audioCtxRef        = useRef<AudioContext | null>(null);
  const micStreamRef       = useRef<MediaStream | null>(null);
  const processorRef       = useRef<ScriptProcessorNode | null>(null);
  const sourceRef          = useRef<MediaStreamAudioSourceNode | null>(null);
  const recordedSamplesRef = useRef<Int16Array[]>([]);
  const sessionIdRef       = useRef<string | null>(null);
  const sessionStartRef    = useRef<number>(0);
  const transcriptRef      = useRef<TranscriptEntry[]>([]);

  // Audio queue — prevents WAV chunks from overlapping
  const audioQueueRef   = useRef<Blob[]>([]);
  const audioPlayingRef = useRef(false);

  const addEntry = useCallback((sender: TranscriptEntry["sender"], text: string) => {
    setTranscript((p) => {
      const next = [...p, { id: uid(), sender, text, timestamp: new Date().toISOString() }];
      transcriptRef.current = next;
      return next;
    });
  }, []);

  const refreshGps = useCallback(() => {
    if (!navigator.geolocation) { setGpsError("Geolocation unsupported"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsError(null); },
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  useEffect(() => {
    apiFetch<{ hasApiKey: boolean }>("/api/status")
      .then((d) => setHasApiKey(!!d.hasApiKey))
      .catch(() => setHasApiKey(false));
    refreshGps();
  }, [refreshGps]);

  // ── Audio queue player — plays WAV via Web Audio API (bypasses autoplay policy) ──
  const playNextInQueue = useCallback(() => {
    if (audioPlayingRef.current) return;
    const next = audioQueueRef.current.shift();
    if (!next) return;

    const ctx = audioCtxRef.current;
    if (!ctx) return;

    audioPlayingRef.current = true;

    next.arrayBuffer().then((buf) => {
      // Resume context if suspended (browser may suspend until user gesture)
      const resume = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
      return resume.then(() => ctx.decodeAudioData(buf));
    }).then((decoded) => {
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      source.onended = () => {
        audioPlayingRef.current = false;
        playNextInQueue();
      };
      source.start(0);
    }).catch(() => {
      audioPlayingRef.current = false;
      playNextInQueue();
    });
  }, []);

  const enqueueAudio = useCallback((blob: Blob) => {
    audioQueueRef.current.push(blob);
    playNextInQueue();
  }, [playNextInQueue]);

  // ── Generate QR code for medical pass ────────────────────────────────────
  const generateMedicalQr = useCallback(async (
    incType: string,
    sessionTranscript: TranscriptEntry[],
    location: { lat: number; lng: number } | null,
  ): Promise<string> => {
    const passData = {
      name:       loadLocal("resq_name", ""),
      phone:      localStorage.getItem("resq_phone") || "",
      blood:      loadLocal("resq_blood", ""),
      age:        loadLocal("resq_age", ""),
      allergies:  loadLocal("resq_allergies", ""),
      conditions: loadLocal("resq_conditions", ""),
      incident:   incType,
      date:       new Date().toISOString(),
      location:   location ? `${location.lat.toFixed(5)},${location.lng.toFixed(5)}` : "Unknown",
      summary:    sessionTranscript
        .filter((t) => t.sender !== "system")
        .slice(-8)
        .map((t) => `${t.sender === "user" ? "Patient" : "Dispatcher"}: ${t.text}`)
        .join(" | "),
    };

    // Encode as base64 and embed into the /medical-pass URL
    // Use LAN IP so the QR works when scanned from other devices (e.g. iPhone Safari)
    const origin = window.location.hostname === "localhost"
      ? `http://192.168.1.3:${window.location.port || 8080}`
      : window.location.origin;
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(passData))));
    const passUrl = `${origin}/medical-pass?data=${encoded}`;

    const qrDataUrl = await QRCode.toDataURL(passUrl, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#111111", light: "#ffffff" },
    });
    return qrDataUrl;
  }, []);

  // ── Save session to history ───────────────────────────────────────────────
  const saveToHistory = useCallback(async (
    incType: string,
    sessionTranscript: TranscriptEntry[],
    startTime: number,
    location: { lat: number; lng: number } | null,
  ) => {
    const qrDataUrl = await generateMedicalQr(incType, sessionTranscript, location);
    const elapsed   = Math.floor((Date.now() - startTime) / 1000);
    const mins      = Math.floor(elapsed / 60);
    const secs      = elapsed % 60;
    const entry: HistoryEntry = {
      id:           uid(),
      date:         new Date().toISOString(),
      incidentType: incType,
      duration:     `${mins}m ${secs}s`,
      transcript:   sessionTranscript,
      qrDataUrl,
      location,
    };
    const existing: HistoryEntry[] = loadLocal("resq_history", []);
    localStorage.setItem("resq_history", JSON.stringify([entry, ...existing].slice(0, 50)));
    return qrDataUrl;
  }, [generateMedicalQr]);

  // ── Terminate session ─────────────────────────────────────────────────────
  const terminateSession = useCallback(() => {
    try { processorRef.current?.disconnect(); sourceRef.current?.disconnect(); } catch {}
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    processorRef.current = null;
    sourceRef.current    = null;
    micStreamRef.current = null;
    audioCtxRef.current  = null;
    recordedSamplesRef.current = [];
    audioQueueRef.current      = [];
    audioPlayingRef.current    = false;
    if (wsRef.current) { try { wsRef.current.close(); } catch {} wsRef.current = null; }

    // Save to history then reset
    const snap      = transcriptRef.current;
    const startTime = sessionStartRef.current;
    const loc       = coords;
    const inc       = incidentType;

    if (snap.some((t) => t.sender !== "system")) {
      saveToHistory(inc, snap, startTime, loc).then((qr) => setMedicalPassQr(qr));
    }

    sessionIdRef.current = null;
    setIsPushingToTalk(false);
    setEmailAlert(null);
    setVehicleDispatch(null);
    setStatus("idle");
  }, [coords, incidentType, saveToHistory]);

  // ── Start session ─────────────────────────────────────────────────────────
  const startSession = useCallback(async (language: string) => {
    try {
      setStatus("connecting");
      setTranscript([]);
      transcriptRef.current = [];
      setMedicalPassQr(null);
      setIncidentType("Emergency");
      sessionStartRef.current = Date.now();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
      });
      micStreamRef.current = stream;

      const victimName: string = (() => { try { return JSON.parse(localStorage.getItem("resq_name") || '""'); } catch { return ""; } })();
      const contacts: { name: string; email: string }[] = (() => { try { return JSON.parse(localStorage.getItem("resq_contacts") || "[]"); } catch { return []; } })();

      const sessionRes = await apiFetch<{ session_id: string }>("/api/session/start", {
        method: "POST",
        body: JSON.stringify({
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
          language,
          victim_name: victimName,
          contacts,
        }),
      });
      sessionIdRef.current = sessionRes.session_id;

      const ws = new WebSocket(wsUrl(`/api/voice/ws/${sessionRes.session_id}`));
      wsRef.current    = ws;
      ws.binaryType    = "arraybuffer";

      ws.onopen = () => {
        setStatus("active");
        addEntry("system", "Dispatcher connected. Hold the button to speak.");

        // Playback context — no fixed sampleRate so browser picks best for output
        const playCtx = new AudioContext();
        audioCtxRef.current = playCtx;
        playCtx.resume().catch(() => {}); // unlock immediately on user-gesture chain

        // Recording context — fixed 16kHz for Whisper STT
        const recCtx  = new AudioContext({ sampleRate: 16000 });
        const source  = recCtx.createMediaStreamSource(stream);
        sourceRef.current   = source;
        const processor     = recCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (e) => {
          const float32 = e.inputBuffer.getChannelData(0);
          const int16   = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          recordedSamplesRef.current.push(int16);
        };
        source.connect(processor);
        processor.connect(recCtx.destination);
      };

      ws.onmessage = (ev) => {
        // Binary = MP3 from gTTS — decode via Web Audio API (handles MP3 + WAV)
        if (ev.data instanceof ArrayBuffer) {
          enqueueAudio(new Blob([ev.data], { type: "audio/mpeg" }));
          return;
        }
        let msg: any;
        try { msg = JSON.parse(ev.data as string); } catch { return; }

        if (msg.type === "transcript") addEntry("user", msg.text);
        if (msg.type === "done")       addEntry("resq", msg.full_text);
        if (msg.type === "error")      addEntry("system", `Error: ${msg.detail}`);
        if (msg.type === "email_sent") {
          const inc = msg.incident_type || "Emergency";
          setIncidentType(inc);
          setEmailAlert({ incidentType: inc, sentTo: msg.sent_to ?? [] });
          addEntry("system", `📧 Alert sent to ${(msg.sent_to ?? []).join(", ") || "contacts"}.`);
        }
        if (msg.type === "vehicle_dispatch") {
          setVehicleDispatch({
            vehicleType: msg.vehicle_type,
            incidentType: msg.incident_type,
            userCoords: msg.user_coords,
          });
          addEntry("system", `🚨 ${msg.vehicle_label} dispatched — en route to your location.`);
        }
      };

      ws.onerror = () => { setStatus("error"); addEntry("system", "Connection error."); };
      ws.onclose = () => { setStatus("idle"); };
    } catch (e: any) {
      setStatus("error");
      addEntry("system", `Failed to start: ${e?.message || e}`);
    }
  }, [addEntry, coords, enqueueAudio]);

  // ── Push-to-talk ──────────────────────────────────────────────────────────
  const startTalking = useCallback(() => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    // Resume AudioContext on user gesture — this unlocks audio playback
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    recordedSamplesRef.current = [];
    setIsPushingToTalk(true);
  }, []);

  const stopTalking = useCallback(() => {
    setIsPushingToTalk(false);
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const chunks = recordedSamplesRef.current;
    recordedSamplesRef.current = [];
    if (chunks.length === 0) return;
    const totalLen = chunks.reduce((s, c) => s + c.length, 0);
    const merged   = new Int16Array(totalLen);
    let offset = 0;
    for (const c of chunks) { merged.set(c, offset); offset += c.length; }
    encodeWav(merged, 16000).arrayBuffer().then((buf) => ws.send(buf));
  }, []);

  const sendTextMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    addEntry("user", text);
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "text", text }));
  }, [addEntry]);

  const copyLocation = useCallback(async () => {
    if (!coords) return;
    await navigator.clipboard.writeText(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
  }, [coords]);

  useEffect(() => { return () => { terminateSession(); }; }, []); // eslint-disable-line

  return {
    status, transcript, hasApiKey, coords, gpsError,
    isPushingToTalk, emailAlert, medicalPassQr, incidentType, vehicleDispatch,
    startSession, terminateSession, startTalking, stopTalking,
    sendTextMessage, copyLocation, refreshGps,
  };
}
