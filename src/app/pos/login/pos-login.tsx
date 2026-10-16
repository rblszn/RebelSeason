"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, UserRound } from "lucide-react";
import { api, errorMessage, fieldErrors } from "@/lib/api-client";
import { PinPad } from "@/components/pos/pin-pad";
import { POS_ROLE_LABELS, type PosRoleType } from "@/lib/pos/types";

type Staff = { id: string; name: string; role: PosRoleType };

const input = "w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground";

function guessDeviceName() {
  if (typeof navigator === "undefined") return "Counter";
  const ua = navigator.userAgent;
  if (/iPad|Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "Counter iPad";
  if (/iPhone/.test(ua)) return "Counter iPhone";
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? "Counter phone" : "Counter tablet";
  return "Counter computer";
}

/**
 * POS sign-in. A new device is set up once by the owner / a manager with email + password;
 * after that, staff tap their name and enter their PIN.
 */
export function PosLogin({ next, device, staff }: { next: string; device: { name: string } | null; staff: Staff[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"pin" | "setup">(device ? "pin" : "setup");
  const [selected, setSelected] = useState<Staff | null>(staff.length === 1 ? staff[0] : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "", deviceName: guessDeviceName() });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const done = () => {
    router.replace(next);
    router.refresh();
  };

  const submitPin = async (pin: string) => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/pos/auth/pin", { body: { staffId: selected.id, pin } });
      done();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const submitSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      await api("/api/pos/auth/device", { body: form });
      done();
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#FAF8F5] flex flex-col items-center px-4 py-8 sm:py-14">
      <div className="text-center mb-8">
        <p className="font-heading text-4xl text-foreground/70">Rebel Season</p>
        <p className="text-[10px] uppercase tracking-[0.3em] text-foreground">Billing counter</p>
        {device && <p className="text-xs text-gray-500 mt-2">This device: {device.name}</p>}
      </div>

      {mode === "setup" ? (
        <form onSubmit={submitSetup} className="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-5 space-y-4" noValidate>
          <div>
            <h1 className="font-heading text-2xl text-foreground">Set up this device</h1>
            <p className="text-sm text-gray-500 mt-1">The owner or a manager signs in once. After that, staff unlock the POS with their PIN.</p>
          </div>
          <div>
            <label htmlFor="pos-email" className="block text-sm font-medium mb-1">Email</label>
            <input id="pos-email" type="email" autoComplete="username" className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="pos-password" className="block text-sm font-medium mb-1">Password</label>
            <input id="pos-password" type="password" autoComplete="current-password" className={input} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
          </div>
          <div>
            <label htmlFor="pos-device" className="block text-sm font-medium mb-1">Name this device</label>
            <input id="pos-device" className={input} value={form.deviceName} onChange={(e) => setForm({ ...form, deviceName: e.target.value })} />
            <p className="text-xs text-gray-500 mt-1">Shown in Admin → Staff, where it can be removed if lost.</p>
          </div>
          {error && !Object.keys(errors).length && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={busy} className="w-full h-12 rounded-lg bg-foreground text-white font-medium disabled:opacity-60">
            {busy ? "Signing in…" : "Sign in & set up"}
          </button>
          {device && (
            <button type="button" onClick={() => { setMode("pin"); setError(null); }} className="w-full text-sm text-gray-500 hover:text-foreground">
              Back to PIN sign-in
            </button>
          )}
        </form>
      ) : !selected ? (
        <div className="w-full max-w-md">
          <h1 className="font-heading text-2xl text-center text-foreground mb-4">Who&apos;s at the counter?</h1>
          {staff.length === 0 ? (
            <p className="text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-200 p-5">
              No staff have a PIN yet. The owner can add staff and PINs in Admin → Staff.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {staff.map((s) => (
                <button key={s.id} onClick={() => { setSelected(s); setError(null); }} className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-foreground active:bg-foreground/5">
                  <UserRound className="w-7 h-7 text-foreground mb-2" />
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-xs text-gray-500">{POS_ROLE_LABELS[s.role]}</p>
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => { setMode("setup"); setError(null); }} className="mt-6 w-full text-sm text-gray-500 hover:text-foreground">
            Owner / manager: sign in with email
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm">
          <button onClick={() => { setSelected(null); setError(null); }} className="inline-flex items-center text-sm text-gray-500 hover:text-foreground mb-4">
            <ChevronLeft className="w-4 h-4" /> Not {selected.name}?
          </button>
          <h1 className="font-heading text-2xl text-center text-foreground">Hi {selected.name.split(" ")[0]}</h1>
          <p className="text-sm text-center text-gray-500 mb-5">Enter your PIN</p>
          <PinPad onSubmit={submitPin} busy={busy} error={error} />
        </div>
      )}
    </div>
  );
}
