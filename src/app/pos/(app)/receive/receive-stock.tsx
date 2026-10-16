"use client";

import { useState } from "react";
import { CheckCircle2, Minus, Plus, Printer, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api-client";
import { ScanBar, Thumb } from "@/components/pos/scan-bar";
import { useCatalog } from "@/components/pos/use-catalog";
import { downloadLabels } from "@/components/pos/download";
import type { PosUnit } from "@/lib/pos/types";

type Line = { variant: PosUnit; quantity: number };

/**
 * New stock arrived: scan (or search) each item, set how many pieces came in, save. Stock goes
 * up for the shop and the website together, and labels for exactly these pieces can be printed.
 */
export function ReceiveStock() {
  const toast = useToast();
  const catalog = useCatalog();
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Line[] | null>(null);
  const [printing, setPrinting] = useState(false);

  const add = (v: PosUnit) => {
    setSaved(null);
    setLines((ls) => (ls.some((l) => l.variant.barcode === v.id) ? ls.map((l) => (l.variant.barcode === v.id ? { ...l, quantity: l.quantity + 1 } : l)) : [...ls, { variant: v, quantity: 1 }]));
  };
  const setQty = (id: string, q: number) => setLines((ls) => ls.map((l) => (l.variant.barcode === id ? { ...l, quantity: Math.max(1, Math.min(10000, q)) } : l)));
  const pieces = lines.reduce((s, l) => s + l.quantity, 0);

  const save = async () => {
    setSaving(true);
    try {
      await api("/api/pos/stock/receive", { body: { lines: lines.map((l) => ({ barcode: l.variant.barcode, quantity: l.quantity })), note: note.trim() || null } });
      toast(`${pieces} piece${pieces === 1 ? "" : "s"} added to stock`);
      setSaved(lines);
      setLines([]);
      setNote("");
      catalog.refresh();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const printLabels = async (list: Line[]) => {
    setPrinting(true);
    try {
      await downloadLabels({ lines: list.map((l) => ({ barcode: l.variant.barcode, quantity: l.quantity })) });
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="font-heading text-2xl">Receive stock</h1>
        <p className="text-sm text-gray-500">Scan each new piece (or search by name). Products must already exist in Admin → Products.</p>
      </div>

      {saved && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
          <CheckCircle2 className="w-6 h-6 text-green-700" />
          <p className="flex-1 text-sm text-green-900">Stock updated for the shop and the website.</p>
          <button onClick={() => printLabels(saved)} disabled={printing} className="inline-flex items-center gap-2 rounded-lg bg-foreground text-white px-4 h-10 text-sm disabled:opacity-60">
            <Printer className="w-4 h-4" /> {printing ? "Preparing…" : `Labels for these ${saved.reduce((s, l) => s + l.quantity, 0)} pieces`}
          </button>
        </div>
      )}

      <ScanBar lookup={catalog.lookup} search={catalog.search} onPick={add} onUnknown={(c) => toast(`No product with the code "${c}". Add it in Admin → Products first.`, "error")} />

      <section className="bg-white border border-gray-200 rounded-xl">
        {lines.length === 0 ? (
          <p className="text-center text-gray-500 py-10 text-sm">Nothing added yet.</p>
        ) : (
          <ul className="divide-y">
            {lines.map((l) => (
              <li key={l.variant.barcode} className="flex items-center gap-3 p-3">
                <Thumb src={l.variant.imageUrl} alt={l.variant.name} />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate">{l.variant.name}</span>
                  <span className="block text-xs text-gray-500 truncate">{l.variant.size ? `Size ${l.variant.size}` : "No size"} · now {l.variant.stock} in stock</span>
                </span>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button onClick={() => setQty(l.variant.barcode, l.quantity - 1)} className="p-2" aria-label="One less"><Minus className="w-4 h-4" /></button>
                  <input aria-label="Pieces received" inputMode="numeric" value={l.quantity} onChange={(e) => setQty(l.variant.barcode, Number(e.target.value.replace(/\D/g, "")) || 1)} className="w-12 text-center tabular-nums text-base" />
                  <button onClick={() => setQty(l.variant.barcode, l.quantity + 1)} className="p-2" aria-label="One more"><Plus className="w-4 h-4" /></button>
                </div>
                <button onClick={() => setLines(lines.filter((x) => x.variant.barcode !== l.variant.barcode))} className="p-2 text-gray-400 hover:text-red-600" aria-label="Remove"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lines.length > 0 && (
        <div className="space-y-3">
          <input aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note, e.g. supplier / bill no. (optional)" className="w-full h-11 border border-gray-300 rounded-lg px-3 text-base bg-white" />
          <div className="flex gap-2">
            <button onClick={() => printLabels(lines)} disabled={printing} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 h-14 text-sm font-medium disabled:opacity-50">
              <Printer className="w-4 h-4" /> Labels
            </button>
            <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-foreground text-white h-14 text-lg font-medium disabled:opacity-50">
              {saving ? "Saving…" : `Add ${pieces} piece${pieces === 1 ? "" : "s"} to stock`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
