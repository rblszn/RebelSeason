"use client";

import { useEffect, useState } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

/** Big-button numeric PIN pad (works with touch and the keyboard). Submits on OK / Enter. */
export function PinPad({ onSubmit, busy, error, maxLength = 6, minLength = 4 }: { onSubmit: (pin: string) => void; busy?: boolean; error?: string | null; maxLength?: number; minLength?: number }) {
  const [pin, setPin] = useState("");

  const press = (d: string) => {
    if (busy) return;
    setPin((p) => (p.length < maxLength ? p + d : p));
  };
  const back = () => setPin((p) => p.slice(0, -1));
  const submit = () => {
    if (pin.length < minLength || busy) return;
    onSubmit(pin);
    setPin(""); // ready for another try if this one is wrong
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") back();
      else if (e.key === "Enter") submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const key = "h-16 rounded-xl bg-white border border-gray-200 text-2xl font-medium text-foreground active:bg-foreground active:text-white disabled:opacity-40 select-none";
  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex justify-center gap-3 h-6 mb-2" aria-label={`${pin.length} digits entered`}>
        {Array.from({ length: Math.max(minLength, pin.length) }, (_, i) => (
          <span key={i} className={cn("w-3.5 h-3.5 rounded-full border-2 border-foreground", i < pin.length && "bg-foreground")} />
        ))}
      </div>
      <p role="alert" className="text-center text-sm text-red-600 h-5 mb-3">{error ?? ""}</p>
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" className={key} onClick={() => press(d)} disabled={busy}>{d}</button>
        ))}
        <button type="button" className={cn(key, "text-base")} onClick={back} disabled={busy || !pin} aria-label="Delete last digit">
          <Delete className="w-6 h-6 mx-auto" />
        </button>
        <button type="button" className={key} onClick={() => press("0")} disabled={busy}>0</button>
        <button type="button" className={cn(key, "bg-foreground text-white border-foreground text-base")} onClick={submit} disabled={busy || pin.length < minLength}>
          {busy ? "…" : "OK"}
        </button>
      </div>
    </div>
  );
}
