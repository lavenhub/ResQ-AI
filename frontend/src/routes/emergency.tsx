import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Copy, Mail, Mic, MicOff, QrCode, RefreshCw, Send } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { useBottomBarClasses } from "@/hooks/useBottomBarPos";
import { INDIAN_LANGUAGES } from "@/lib/types";

type VehicleType = "ambulance" | "fire" | "police";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency — ResQ AI" },
      { name: "description", content: "Active emergency response with AI dispatcher." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <EmergencyPage />
    </AuthGuard>
  ),
});

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}

// ─── Vehicle helpers (shared by overlay + status bar) ────────────────────────

const VEHICLE_EMOJI: Record<string, string> = {
  ambulance: "🚑",
  fire:      "🚒",
  police:    "🚔",
};
const VEHICLE_COLOR: Record<string, string> = {
  ambulance: "#C62828",
  fire:      "#E65100",
  police:    "#1565C0",
};
const TRAVEL_MS = 30_000;
const SPAWN_KM  = 2.0;
const MAP_PAD   = 0.028;

function offsetLatLng(lat: number, lng: number, bearingDeg: number, km: number) {
  const R = 6371, d = km / R, b = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180, λ1 = (lng * Math.PI) / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(b));
  const λ2 = λ1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: (φ2 * 180) / Math.PI, lng: (λ2 * 180) / Math.PI };
}
function toPct(lat: number, lng: number, minLat: number, maxLat: number, minLng: number, maxLng: number) {
  return {
    x: ((lng - minLng) / (maxLng - minLng)) * 100,
    y: ((maxLat - lat) / (maxLat - minLat)) * 100,
  };
}

// ─── MapVehicleOverlay ────────────────────────────────────────────────────────
// Animates vehicle emoji over the existing map iframe — no second map.

function MapVehicleOverlay({
  vehicleType,
  userCoords,
}: {
  vehicleType: VehicleType;
  userCoords: { lat: number; lng: number };
}) {
  const emoji   = VEHICLE_EMOJI[vehicleType] ?? "🚑";
  const color   = VEHICLE_COLOR[vehicleType] ?? "#C62828";
  const bearing = useRef(Math.floor(Math.random() * 360));
  const spawn   = useRef(offsetLatLng(userCoords.lat, userCoords.lng, bearing.current, SPAWN_KM));

  const minLat = userCoords.lat - MAP_PAD, maxLat = userCoords.lat + MAP_PAD;
  const minLng = userCoords.lng - MAP_PAD, maxLng = userCoords.lng + MAP_PAD;

  const spawnPct = toPct(spawn.current.lat, spawn.current.lng, minLat, maxLat, minLng, maxLng);
  const userPct  = toPct(userCoords.lat, userCoords.lng, minLat, maxLat, minLng, maxLng);

  const startRef = useRef<number | null>(null);
  const rafRef   = useRef<number | null>(null);
  const [pos, setPos]         = useState(spawnPct);
  const [arrived, setArrived] = useState(false);
  const [eta, setEta]         = useState(Math.round(TRAVEL_MS / 1000));

  useEffect(() => {
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const p    = Math.min((ts - startRef.current) / TRAVEL_MS, 1);
      const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      setPos({ x: spawnPct.x + (userPct.x - spawnPct.x) * ease, y: spawnPct.y + (userPct.y - spawnPct.y) * ease });
      setEta(Math.max(0, Math.round(((1 - p) * TRAVEL_MS) / 1000)));
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
      else setArrived(true);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []); // eslint-disable-line

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* ETA badge */}
      <div className="absolute top-2 left-2 border-2 border-white px-2 py-1 text-xs font-black uppercase text-white shadow" style={{ background: color }}>
        {arrived ? `${emoji} On Scene` : `${emoji} ${eta}s away`}
      </div>

      {/* SVG path line from vehicle to user */}
      {!arrived && (
        <svg className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
          <line
            x1={`${pos.x}%`} y1={`${pos.y}%`}
            x2={`${userPct.x}%`} y2={`${userPct.y}%`}
            stroke={color} strokeWidth="2" strokeDasharray="6,4" opacity="0.6"
          />
        </svg>
      )}

      {/* Pulsing user pin — large and obvious */}
      <div className="absolute" style={{ left: `${userPct.x}%`, top: `${userPct.y}%`, transform: "translate(-50%,-50%)" }}>
        <div className="absolute rounded-full animate-ping" style={{ width: 48, height: 48, background: color, opacity: 0.3, top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
        <div className="absolute rounded-full animate-ping" style={{ width: 30, height: 30, background: color, opacity: 0.5, top: "50%", left: "50%", transform: "translate(-50%,-50%)", animationDelay: "0.3s" }} />
        <div className="relative flex items-center justify-center rounded-full border-2 border-white shadow-lg" style={{ width: 26, height: 26, background: color }}>
          <span style={{ fontSize: 12 }}>📍</span>
        </div>
        {/* "YOU" label */}
        <div className="absolute whitespace-nowrap border border-white px-1 text-[9px] font-black text-white" style={{ background: color, top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 2 }}>
          YOU
        </div>
      </div>

      {/* Moving vehicle */}
      {!arrived && (
        <div className="absolute" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%,-50%)", fontSize: 28, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))" }}>
          {emoji}
        </div>
      )}

      {/* Arrived — flash on scene */}
      {arrived && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="border-2 border-white px-4 py-2 text-sm font-black uppercase text-white shadow-xl" style={{ background: color }}>
            {emoji} On Scene
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VehicleStatusBar ─────────────────────────────────────────────────────────

function VehicleStatusBar({ vehicleType, incidentType }: { vehicleType: VehicleType; incidentType: string }) {
  const emoji = VEHICLE_EMOJI[vehicleType] ?? "🚑";
  const color = VEHICLE_COLOR[vehicleType] ?? "#C62828";
  const label = vehicleType === "ambulance" ? "Ambulance" : vehicleType === "fire" ? "Fire Brigade" : "Police Van";
  return (
    <div className="flex items-center gap-3 border-2 border-black px-4 py-2" style={{ background: color }}>
      <span className="text-2xl">{emoji}</span>
      <div>
        <div className="text-xs font-black uppercase text-white">{label} Dispatched</div>
        <div className="text-[10px] text-white/80">{incidentType} — en route to your location</div>
      </div>
    </div>
  );
}

// ─── EmergencyPage ────────────────────────────────────────────────────────────

function EmergencyPage() {
  const navigate = useNavigate();
  const agent    = useVoiceAgent();
  const pos      = useBottomBarClasses("border-t-2 border-black bg-[#C62828] py-4 text-sm font-black uppercase tracking-wide text-white");
  const [language, setLanguage] = useState(() => {
    try { return JSON.parse(localStorage.getItem("resq_language") || '"English"'); }
    catch { return "English"; }
  });
  const [textInput, setTextInput] = useState("");
  const transcriptDivRef = useRef<HTMLDivElement>(null);

  const name       = loadLocal("resq_name",       "");
  const blood      = loadLocal("resq_blood",       "—");
  const age        = loadLocal<number>("resq_age", 0);
  const allergies  = loadLocal("resq_allergies",   "—");
  const conditions = loadLocal("resq_conditions",  "—");

  useEffect(() => {
    if (transcriptDivRef.current)
      transcriptDivRef.current.scrollTop = transcriptDivRef.current.scrollHeight;
  }, [agent.transcript]);

  const active     = agent.status === "active";
  const connecting = agent.status === "connecting";
  const talking    = agent.isPushingToTalk;

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* ── Header ── */}
      <header className={`sticky top-0 z-20 border-b-2 border-black px-4 py-3 ${active ? "resq-header-active bg-[#C62828] text-white" : "bg-white text-black"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={22} strokeWidth={2.5} />
            <span className="text-base font-black uppercase tracking-wide">{active ? "Emergency Active" : "Emergency"}</span>
          </div>
          <span className={`flex items-center gap-2 border-2 px-2 py-1 text-[10px] font-bold uppercase ${active ? "border-white bg-white text-[#C62828]" : "border-black bg-white text-black"}`}>
            <span className={`h-2 w-2 rounded-full ${active ? "bg-[#C62828]" : "bg-black/40"}`} />
            {active ? "Live" : "Standby"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[480px] space-y-4 px-4 py-4">

        {/* ── Language ── */}
        <div className="border-2 border-black bg-white p-3">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-black">Language</label>
          <select disabled={active || connecting} value={language} onChange={(e) => setLanguage(e.target.value)}
            className="w-full border-2 border-black bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-50">
            {INDIAN_LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>

        {/* ── Map — vehicle animates on top of this same map ── */}
        <div className="relative border-2 border-black bg-white overflow-hidden" style={{ height: 220 }}>
          {agent.coords ? (
            <iframe
              title="map"
              className="absolute inset-0 h-full w-full border-0"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${agent.coords.lng - MAP_PAD}%2C${agent.coords.lat - MAP_PAD}%2C${agent.coords.lng + MAP_PAD}%2C${agent.coords.lat + MAP_PAD}&layer=mapnik&marker=${agent.coords.lat}%2C${agent.coords.lng}`}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-bold uppercase tracking-wider text-black/60">Acquiring GPS...</div>
          )}
          {agent.coords && !agent.vehicleDispatch && (
            <div className="absolute bottom-2 right-2 border-2 border-black bg-white px-2 py-1 text-[10px] font-bold text-black">
              {agent.coords.lat.toFixed(4)}, {agent.coords.lng.toFixed(4)}
            </div>
          )}
          {/* Vehicle overlay on the SAME map — no second iframe */}
          {agent.vehicleDispatch && agent.coords && (
            <MapVehicleOverlay vehicleType={agent.vehicleDispatch.vehicleType} userCoords={agent.coords} />
          )}
        </div>

        {/* ── Vehicle status bar ── */}
        {agent.vehicleDispatch && (
          <VehicleStatusBar vehicleType={agent.vehicleDispatch.vehicleType} incidentType={agent.vehicleDispatch.incidentType} />
        )}

        {/* ── Dispatcher control ── */}
        <div className="border-2 border-black bg-white p-4">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-green-600" : connecting ? "bg-amber-500" : "bg-black/30"}`} />
            <span className="text-sm font-black uppercase text-black">
              {active ? "AI Dispatcher Connected" : connecting ? "Connecting to Dispatcher..." : "AI Dispatcher Standby"}
            </span>
          </div>
          <p className="mt-1 text-xs text-black/70">
            {active ? "Speak clearly. ResQ AI is listening and guiding you in real time."
              : connecting ? "Establishing secure live channel..."
              : "Tap below to begin a guided live session."}
          </p>
          <div className="my-4 flex h-12 items-end justify-center gap-1">
            {[0,1,2,3,4,5,6].map((i) => (
              <span key={i} className={`w-1.5 ${active || connecting ? "resq-wave-bar" : ""} ${connecting ? "bg-amber-500" : "bg-[#C62828]"}`}
                style={{ height: active || connecting ? "100%" : "10%", animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <button onClick={() => active ? agent.terminateSession() : agent.startSession(language)} disabled={connecting}
            className={`flex w-full items-center justify-center gap-2 rounded border-2 border-black px-4 py-3 text-sm font-black uppercase tracking-wide text-white ${connecting ? "bg-black/40" : active ? "bg-black" : "bg-[#C62828]"}`}>
            {active ? <MicOff size={18} /> : <Mic size={18} />}
            {active ? "End Session" : connecting ? "Connecting..." : "Start AI Dispatcher"}
          </button>
          {active && (
            <button
              onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); agent.startTalking(); }}
              onPointerUp={agent.stopTalking} onPointerCancel={agent.stopTalking}
              className={`mt-3 flex w-full select-none items-center justify-center gap-2 rounded border-2 border-black px-4 py-5 text-base font-black uppercase tracking-wide transition-colors ${talking ? "bg-[#C62828] text-white" : "bg-white text-black"}`}>
              <Mic size={22} />
              {talking ? "Listening… Release to send" : "Hold to Talk"}
            </button>
          )}
          {active && (
            <div className="mt-3 flex gap-2">
              <input value={textInput} onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && textInput.trim()) { agent.sendTextMessage(textInput); setTextInput(""); } }}
                placeholder="Type a message..." className="flex-1 border-2 border-black bg-white px-3 py-2 text-sm" />
              <button onClick={() => { if (textInput.trim()) { agent.sendTextMessage(textInput); setTextInput(""); } }}
                className="flex items-center justify-center border-2 border-black bg-black px-3 text-white"><Send size={16} /></button>
            </div>
          )}
        </div>

        {/* ── Email Sent Banner ── */}
        {agent.emailAlert && (
          <div className="flex items-start gap-3 border-2 border-green-600 bg-green-50 p-4">
            <Mail size={20} className="mt-0.5 shrink-0 text-green-600" />
            <div>
              <div className="text-sm font-black uppercase text-green-700">Emergency Alert Sent</div>
              <div className="mt-0.5 text-xs text-green-700">
                <span className="font-bold">{agent.emailAlert.incidentType}</span> — Notified{" "}
                {agent.emailAlert.sentTo.length} contact{agent.emailAlert.sentTo.length !== 1 ? "s" : ""}
                {agent.emailAlert.sentTo.length > 0 && <span className="ml-1 text-green-600">({agent.emailAlert.sentTo.join(", ")})</span>}
              </div>
            </div>
          </div>
        )}

        {/* ── Live Transcript ── */}
        {agent.transcript.length > 0 && (
          <div className="border-2 border-black bg-white p-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-black">Live Transcript</div>
            <div ref={transcriptDivRef} className="max-h-[200px] space-y-2 overflow-y-auto pr-1 text-sm">
              {agent.transcript.map((t) => (
                <div key={t.id} className="leading-snug">
                  {t.sender === "system" ? (
                    <span className="text-xs italic text-black/50">{t.text}</span>
                  ) : (
                    <span>
                      <span className={`mr-1 font-black uppercase ${t.sender === "resq" ? "text-[#C62828]" : "text-black"}`}>
                        {t.sender === "resq" ? "RESQ:" : "YOU:"}
                      </span>
                      <span className="text-black">{t.text}</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Medical Handover Pass ── */}
        {agent.medicalPassQr ? (
          <div className="border-2 border-black bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-[#C62828]">
              <QrCode size={16} /> Medical Handover Pass — Saved to History
            </div>
            <p className="mb-3 text-[11px] text-black/60">Scan this QR to open the full medical report PDF.</p>
            <div className="flex justify-center">
              <img src={agent.medicalPassQr} alt="Medical Handover QR" className="h-52 w-52 border-2 border-black" />
            </div>
            <button
              onClick={() => { const a = document.createElement("a"); a.href = agent.medicalPassQr!; a.download = `resq-handover-${Date.now()}.png`; a.click(); }}
              className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white">
              <QrCode size={14} /> Download QR Pass
            </button>
          </div>
        ) : (
          <div className="border-2 border-black bg-[#C62828]/10 p-4">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#C62828]">Medical ID Pass</div>
            <div className="mb-2 text-sm font-black text-black">{name || "—"}</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><div className="text-[9px] font-bold uppercase text-black/60">Age</div><div className="font-black">{age || "—"}</div></div>
              <div><div className="text-[9px] font-bold uppercase text-black/60">Blood</div><div className="font-black">{blood}</div></div>
              <div><div className="text-[9px] font-bold uppercase text-black/60">Allergies</div><div className="font-black truncate">{allergies}</div></div>
            </div>
            {conditions && <div className="mt-2 text-xs"><span className="font-bold uppercase text-black/60">Conditions: </span><span className="text-black">{conditions}</span></div>}
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className={`border-2 border-black px-2 py-1 font-black uppercase ${active ? "bg-[#C62828] text-white" : "bg-white text-black"}`}>{active ? "Priority Red" : "Standby"}</span>
              <button onClick={agent.copyLocation} className="inline-flex items-center gap-1 font-bold uppercase text-black">
                <Copy size={12} />{agent.coords ? `${agent.coords.lat.toFixed(4)}, ${agent.coords.lng.toFixed(4)}` : "—"}
              </button>
            </div>
            <button onClick={agent.refreshGps} className="mt-3 inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-1.5 text-[10px] font-bold uppercase">
              <RefreshCw size={12} /> Refresh GPS
            </button>
          </div>
        )}
      </main>

      {/* ── End Emergency ── */}
      <button onClick={() => { agent.terminateSession(); navigate({ to: "/history" }); }}
        className={pos}>
        End Emergency — View Pass &amp; History
      </button>
      <BottomNav />
    </div>
  );
}
