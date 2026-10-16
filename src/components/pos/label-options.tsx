"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, FileCheck2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { downloadLabelsFor } from "./download";

/**
 * Label printing options shared by every download button on the Barcodes pages
 * (remembered on this device): one label per piece in stock or one per size, the first free
 * position on a part-used sticker sheet, and light cut lines for plain paper.
 */
export type LabelOptions = { mode: "stock" | "one"; startAt: number; guides: boolean };

const KEY = "rebel-pos-label-options";
const EVENT = "rebel-label-options";
const DEFAULTS: LabelOptions = { mode: "stock", startAt: 1, guides: true };
let cache: { raw: string | null; value: LabelOptions } = { raw: null, value: DEFAULTS };

function read(): LabelOptions {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // storage blocked: defaults
  }
  if (raw !== cache.raw) cache = { raw, value: raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<LabelOptions>) } : DEFAULTS };
  return cache.value;
}

function write(next: LabelOptions) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    cache = { raw: JSON.stringify(next), value: next };
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useLabelOptions() {
  const options = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(EVENT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    read,
    () => DEFAULTS
  );
  return [options, (patch: Partial<LabelOptions>) => write({ ...options, ...patch })] as const;
}

export function LabelOptionsBar() {
  const toast = useToast();
  const [o, set] = useLabelOptions();
  const [testing, setTesting] = useState(false);
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium mr-1">How many labels?</span>
        {(
          [
            ["stock", "One per piece in stock"],
            ["one", "One per size"],
          ] as const
        ).map(([value, label]) => (
          <button key={value} type="button" onClick={() => set({ mode: value })} aria-pressed={o.mode === value} className={cn("rounded-full border px-3 py-1.5 text-sm", o.mode === value ? "border-foreground bg-foreground text-white" : "border-gray-300 bg-white")}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          Start at label #
          <input type="number" min={1} max={65} value={o.startAt} onChange={(e) => set({ startAt: Math.min(65, Math.max(1, Number(e.target.value) || 1)) })} className="w-16 h-9 border border-gray-300 rounded-md px-2 text-base tabular-nums" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={o.guides} onChange={(e) => set({ guides: e.target.checked })} className="w-4 h-4 accent-foreground" />
          Cut lines (plain paper)
        </label>
        <button
          type="button"
          disabled={testing}
          onClick={async () => {
            setTesting(true);
            await downloadLabelsFor({ test: 1 }).catch((e) => toast(errorMessage(e), "error"));
            setTesting(false);
          }}
          className="inline-flex items-center gap-1.5 text-foreground hover:underline disabled:opacity-50"
        >
          <FileCheck2 className="w-4 h-4" /> Test print
        </button>
      </div>
      <p className="text-xs text-gray-500">A4 sheet, 65 labels (5 × 13, each 38 × 21 mm). Print at <b>100% / Actual size</b> (not “Fit to page”). Plain paper: cut along the light lines. Also fits ready-made 65-label sticker sheets.</p>
    </section>
  );
}

/** Download labels for a department / category / product with the current options. */
export function LabelDownloadButton({ scope, id, pieces, units, className, compact }: { scope: "department" | "category" | "product"; id: string; pieces: number; units: number; className?: string; compact?: boolean }) {
  const toast = useToast();
  const [o] = useLabelOptions();
  const [busy, setBusy] = useState(false);
  const count = o.mode === "one" ? units : pieces;
  return (
    <button
      type="button"
      disabled={busy || count === 0}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadLabelsFor({ scope, id, mode: o.mode, startAt: o.startAt, guides: o.guides ? 1 : 0 });
        } catch (e) {
          toast(errorMessage(e), "error");
        } finally {
          setBusy(false);
        }
      }}
      className={cn("inline-flex items-center justify-center gap-1.5 rounded-lg border border-foreground text-foreground bg-white px-3 h-10 text-sm font-medium hover:bg-foreground hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-foreground", className)}
      title={count === 0 ? (o.mode === "stock" ? "Nothing in stock" : "No sizes") : undefined}
    >
      <Download className="w-4 h-4" />
      {busy ? "Preparing…" : compact ? count : `${count} label${count === 1 ? "" : "s"}`}
    </button>
  );
}
