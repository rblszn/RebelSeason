"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Lock } from "lucide-react";
import { api } from "@/lib/api-client";
import { POS_ROLE_LABELS, type PosRoleType } from "@/lib/pos/types";

export type PosUser = { id: string; name: string; role: PosRoleType; maxDiscountPercent: number };

const PosUserContext = createContext<PosUser | null>(null);

/** The signed-in staff member (inside the POS shell). */
export function usePosUser() {
  const user = useContext(PosUserContext);
  if (!user) throw new Error("usePosUser must be used inside <PosShell>");
  return user;
}

/** Lock the POS and go to the PIN screen. */
export function useLock() {
  const router = useRouter();
  return useCallback(async () => {
    await api("/api/pos/auth/lock", { method: "POST" }).catch(() => undefined);
    router.replace("/pos/login");
    router.refresh();
  }, [router]);
}

/**
 * POS frame: slim top bar (home, who's signed in, lock) and the auto-lock timer. The server
 * also refuses requests after the same idle time, so a forgotten phone can't be used.
 */
export function PosShell({ user, idleMinutes, deviceName, children }: { user: PosUser; idleMinutes: number; deviceName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const lock = useLock();
  const lastActive = useRef(0);

  useEffect(() => {
    lastActive.current = Date.now();
    const bump = () => {
      lastActive.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "touchstart", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - lastActive.current > idleMinutes * 60_000) lock();
    }, 15_000);
    // The server refused a request because the session is locked or expired.
    window.addEventListener("rebel:pos-locked", lock);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(timer);
      window.removeEventListener("rebel:pos-locked", lock);
    };
  }, [idleMinutes, lock]);

  return (
    <PosUserContext.Provider value={user}>
      <div className="min-h-dvh bg-[#FAF8F5] text-foreground flex flex-col">
        <header className="sticky top-0 z-30 bg-foreground text-white print:hidden">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 h-12 flex items-center gap-2">
            <Link href="/pos" className="flex items-center gap-2 py-2 pr-2" aria-label="POS home">
              {pathname === "/pos" ? (
                <span className="font-heading text-xl text-primary leading-none">Rebel Season <span className="text-xs tracking-[0.2em] uppercase text-white/80">POS</span></span>
              ) : (
                <>
                  <Home className="w-5 h-5" />
                  <span className="text-sm hidden sm:inline">Home</span>
                </>
              )}
            </Link>
            <div className="flex-1" />
            <div className="text-right leading-tight min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-[11px] text-white/70 truncate">
                {POS_ROLE_LABELS[user.role]} · {deviceName}
              </p>
            </div>
            <button onClick={lock} className="ml-1 flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/20 px-3 py-2 text-sm" aria-label="Lock the POS">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </header>
        <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-4 py-4">{children}</main>
      </div>
    </PosUserContext.Provider>
  );
}
