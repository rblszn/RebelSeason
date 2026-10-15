"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

// One shared 1-second tick. The server renders placeholders (no clock), then the
// browser fills in the real time, so the markup never mismatches during hydration.
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}
const getSnapshot = (): number | null => Math.floor(Date.now() / 1000);
const getServerSnapshot = (): number | null => null;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Live countdown to `target` (an ISO time). When it reaches zero the page asks
 * for fresh data a few times, so the new drop shows up without a manual refresh.
 */
export function DropCountdown({ target, className = "" }: { target: string; className?: string }) {
  const nowSeconds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const router = useRouter();
  const attempts = useRef(0);

  const remaining = nowSeconds === null ? null : Math.max(0, Math.floor(new Date(target).getTime() / 1000) - nowSeconds);

  useEffect(() => {
    if (remaining !== 0) return;
    attempts.current = 0;
    router.refresh();
    const id = setInterval(() => {
      attempts.current += 1;
      if (attempts.current > 8) {
        clearInterval(id);
        return;
      }
      router.refresh();
    }, 8000);
    return () => clearInterval(id);
  }, [remaining, router]);

  const days = remaining === null ? null : Math.floor(remaining / 86400);
  const hours = remaining === null ? null : Math.floor((remaining % 86400) / 3600);
  const minutes = remaining === null ? null : Math.floor((remaining % 3600) / 60);
  const seconds = remaining === null ? null : remaining % 60;

  const units: { label: string; value: number | null }[] = [
    ...(days !== null && days > 0 ? [{ label: "Days", value: days }] : []),
    { label: "Hours", value: hours },
    { label: "Mins", value: minutes },
    { label: "Secs", value: seconds },
  ];

  return (
    <div
      className={`flex items-stretch gap-2 sm:gap-3 ${className}`}
      role="timer"
      aria-label={remaining === null ? "Countdown to the next drop" : `Next drop in ${days ? `${days} days ` : ""}${hours} hours ${minutes} minutes`}
    >
      {units.map((unit) => (
        <div
          key={unit.label}
          className="flex min-w-[58px] flex-col items-center rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm sm:min-w-[68px]"
        >
          <span className="font-heading text-2xl tabular-nums leading-none text-background sm:text-3xl">
            {unit.value === null ? "--" : pad(unit.value)}
          </span>
          <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-background/60">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}
