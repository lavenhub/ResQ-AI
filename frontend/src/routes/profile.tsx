import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Trash2, X } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { INDIAN_LANGUAGES } from "@/lib/types";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — ResQ AI" },
      { name: "description", content: "Manage your medical information and preferences." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <ProfilePage />
    </AuthGuard>
  ),
});

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

interface Contact {
  name: string;
  email: string;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function ProfilePage() {
  const navigate = useNavigate();

  // ── Personal ──────────────────────────────────────────────────────────────
  const [name, setName]       = useState(() => load("resq_name", ""));
  const [phone, setPhone]     = useState("");

  // ── Medical ───────────────────────────────────────────────────────────────
  const [blood, setBlood]           = useState(() => load("resq_blood", "O+"));
  const [age, setAge]               = useState<number>(() => load("resq_age", 28));
  const [allergies, setAllergies]   = useState(() => load("resq_allergies", ""));
  const [conditions, setConditions] = useState(() => load("resq_conditions", ""));

  // ── Preferences ───────────────────────────────────────────────────────────
  const [language, setLanguage] = useState(() => load("resq_language", "English"));
  const [push, setPush]         = useState(() => load("resq_push", true));

  // ── Emergency contacts ────────────────────────────────────────────────────
  const [contacts, setContacts] = useState<Contact[]>(() =>
    load("resq_contacts", [
      { name: "Jane Doe",   email: "jane@example.com" },
      { name: "Mark Smith", email: "mark@example.com" },
    ]),
  );

  // ── Add-contact modal ─────────────────────────────────────────────────────
  const [saved, setSaved]         = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName]     = useState("");
  const [newEmail, setNewEmail]   = useState("");
  const [modalErr, setModalErr]   = useState("");

  useEffect(() => {
    setPhone(localStorage.getItem("resq_phone") || "");
  }, []);

  const signOut = () => {
    localStorage.removeItem("resq_phone");
    navigate({ to: "/auth" });
  };

  const removeContact = (i: number) =>
    setContacts((prev) => prev.filter((_, k) => k !== i));

  const openModal = () => {
    setNewName("");
    setNewEmail("");
    setModalErr("");
    setShowModal(true);
  };

  const addContact = () => {
    if (!newName.trim()) { setModalErr("Name is required."); return; }
    if (!newEmail.trim() || !newEmail.includes("@")) {
      setModalErr("Valid email is required.");
      return;
    }
    setContacts((prev) => [...prev, { name: newName.trim(), email: newEmail.trim() }]);
    setShowModal(false);
  };

  const saveAll = () => {
    localStorage.setItem("resq_name",       JSON.stringify(name));
    localStorage.setItem("resq_blood",      JSON.stringify(blood));
    localStorage.setItem("resq_age",        JSON.stringify(age));
    localStorage.setItem("resq_allergies",  JSON.stringify(allergies));
    localStorage.setItem("resq_conditions", JSON.stringify(conditions));
    localStorage.setItem("resq_language",   JSON.stringify(language));
    localStorage.setItem("resq_push",       JSON.stringify(push));
    localStorage.setItem("resq_contacts",   JSON.stringify(contacts));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const discardAll = () => {
    setName(load("resq_name", ""));
    setBlood(load("resq_blood", "O+"));
    setAge(load("resq_age", 28));
    setAllergies(load("resq_allergies", ""));
    setConditions(load("resq_conditions", ""));
    setLanguage(load("resq_language", "English"));
    setPush(load("resq_push", true));
    setContacts(
      load("resq_contacts", [
        { name: "Jane Doe",   email: "jane@example.com" },
        { name: "Mark Smith", email: "mark@example.com" },
      ]),
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b-2 border-black bg-white px-4 py-3">
        <span className="text-lg font-black text-[#C62828]">RESQ AI</span>
        <div className="flex items-center gap-3">
          <Bell size={20} strokeWidth={2.5} />
          <div className="flex h-9 w-9 items-center justify-center border-2 border-black bg-white text-xs font-bold">
            {name ? initials(name) : (phone || "U").slice(-2)}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1140px] px-4 py-4">
        <div>
          <h1 className="text-xl font-black uppercase text-black">Profile & Settings</h1>
          <p className="mt-1 text-xs text-black/60">Manage your critical information.</p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">

          {/* ── Left column ── */}
          <div className="space-y-4">

            {/* Personal Info */}
            <section className="border-2 border-black bg-white p-4">
              <div className="mb-3 text-xs font-black uppercase">Personal Info</div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase">Full Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full border-2 border-black bg-white px-3 py-2 text-sm font-semibold placeholder:text-black/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase">Phone Number</label>
                  <input
                    value={phone}
                    readOnly
                    className="w-full border-2 border-black bg-black/5 px-3 py-2 text-sm font-semibold text-black/60"
                  />
                  <p className="mt-1 text-[10px] text-black/40">Verified via OTP — cannot be changed here.</p>
                </div>
              </div>
            </section>

            {/* Medical Profile */}
            <section className="border-2 border-black bg-white p-4">
              <div className="mb-3 text-xs font-black uppercase">Medical Profile</div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase">Blood Group</label>
                  <select
                    value={blood}
                    onChange={(e) => setBlood(e.target.value)}
                    className="w-full border-2 border-black bg-white px-3 py-2 text-sm font-semibold"
                  >
                    {BLOOD.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full border-2 border-black bg-white px-3 py-2 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase">Allergies</label>
                  <input
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g. Peanuts, Penicillin"
                    className="w-full border-2 border-black bg-white px-3 py-2 text-sm font-semibold placeholder:text-black/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase">Chronic Conditions</label>
                  <textarea
                    value={conditions}
                    onChange={(e) => setConditions(e.target.value)}
                    rows={3}
                    placeholder="e.g. Diabetes, Hypertension"
                    className="w-full border-2 border-black bg-white px-3 py-2 text-sm font-semibold placeholder:text-black/30"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-4">

            {/* Emergency Contacts */}
            <section className="border-2 border-black bg-white p-4">
              <div className="mb-3 text-xs font-black uppercase">Emergency Contacts</div>
              <div className="space-y-2">
                {contacts.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 border-2 border-black bg-white p-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-black text-xs font-black text-white">
                      {initials(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-black">{c.name}</div>
                      <div className="truncate text-[11px] text-black/60">{c.email}</div>
                    </div>
                    <button
                      onClick={() => removeContact(i)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-black bg-white text-[#C62828]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={openModal}
                  className="w-full border-2 border-dashed border-black bg-white py-3 text-xs font-black uppercase text-black hover:bg-black/5"
                >
                  + Add Contact
                </button>
              </div>
            </section>

            {/* Preferences */}
            <section className="border-2 border-black bg-white p-4">
              <div className="mb-3 text-xs font-black uppercase">Preferences</div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full border-2 border-black bg-white px-3 py-2 text-sm font-semibold"
                  >
                    {INDIAN_LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase">Push Notifications</span>
                  <button
                    onClick={() => setPush((p) => !p)}
                    className={`relative h-7 w-12 border-2 border-black ${push ? "bg-[#C62828]" : "bg-white"}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 border-2 border-black bg-white transition-all ${push ? "left-6" : "left-0.5"}`} />
                  </button>
                </div>
              </div>
            </section>

            {/* Account */}
            <section className="border-2 border-black bg-white p-4">
              <div className="mb-3 text-xs font-black uppercase">Account</div>
              <button
                onClick={signOut}
                className="w-full rounded border-2 border-[#C62828] bg-white px-4 py-2 text-sm font-black uppercase text-[#C62828]"
              >
                Sign Out
              </button>
            </section>
          </div>
        </div>

        {/* ── Save / Discard ── */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={discardAll}
            className="flex-1 border-2 border-black bg-white px-4 py-3 text-sm font-black uppercase"
          >
            Discard
          </button>
          <button
            onClick={saveAll}
            className={`flex-1 border-2 border-black px-4 py-3 text-sm font-black uppercase text-white transition-colors ${
              saved ? "border-green-700 bg-green-600" : "bg-black"
            }`}
          >
            {saved ? "✓ Saved!" : "Save Changes"}
          </button>
        </div>
      </main>

      <BottomNav />

      {/* ── Add Contact Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm border-2 border-black bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-black uppercase">Add Emergency Contact</span>
              <button onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            {modalErr && (
              <div className="mb-3 border-2 border-[#C62828] bg-white px-3 py-2 text-xs font-semibold text-[#C62828]">
                {modalErr}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase">Full Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contact's full name"
                  className="w-full border-2 border-black bg-white px-3 py-2 text-sm font-semibold placeholder:text-black/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="contact@email.com"
                  className="w-full border-2 border-black bg-white px-3 py-2 text-sm font-semibold placeholder:text-black/30"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border-2 border-black bg-white py-2 text-xs font-black uppercase"
              >
                Cancel
              </button>
              <button
                onClick={addContact}
                className="flex-1 border-2 border-black bg-[#C62828] py-2 text-xs font-black uppercase text-white"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
