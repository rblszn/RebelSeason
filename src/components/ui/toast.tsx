"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<((message: string, kind?: ToastKind) => void) | null>(null);

/** Live-region toasts (announced by screen readers). Auto-dismiss after 4s. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, kind, message }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const Icon = { success: CheckCircle2, error: AlertCircle, info: Info };

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="fixed z-[110] bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 flex flex-col gap-2 sm:w-96 pointer-events-none"
      >
        {toasts.map((t) => {
          const I = Icon[t.kind];
          return (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-md px-4 py-3 shadow-lg text-sm font-body bg-white border-l-4",
                t.kind === "success" && "border-green-600",
                t.kind === "error" && "border-red-600",
                t.kind === "info" && "border-primary"
              )}
            >
              <I
                className={cn(
                  "w-5 h-5 shrink-0",
                  t.kind === "success" && "text-green-600",
                  t.kind === "error" && "text-red-600",
                  t.kind === "info" && "text-foreground/70"
                )}
              />
              <p className="flex-1 text-foreground">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-foreground/40 hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
