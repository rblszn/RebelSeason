"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Field, inputCls } from "@/components/admin/ui";
import { api, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ADJUSTMENT_REASONS } from "@/lib/pos/validations";

type Unit = { barcode: string; label: string; stock: number };

/** Correct stock with a reason (damaged, gift, photo-shoot sample, lost, found …). */
export function AdjustStock() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Unit[]>([]);
  const [variant, setVariant] = useState<Unit | null>(null);
  const [direction, setDirection] = useState<"remove" | "add">("remove");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState<(typeof ADJUSTMENT_REASONS)[number]>("Damaged");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => {
      api<{ units: Unit[] }>(`/api/admin/stock/units?q=${encodeURIComponent(q.trim())}`)
        .then((r) => setResults(r.units))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const reset = () => {
    setQ("");
    setResults([]);
    setVariant(null);
    setQty("1");
    setNote("");
    setDirection("remove");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variant) return;
    const n = Math.floor(Number(qty));
    setBusy(true);
    try {
      await api("/api/admin/stock/adjust", { body: { barcode: variant.barcode, delta: direction === "add" ? n : -n, reason, note: note.trim() || null } });
      toast("Stock updated");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-foreground text-white px-3 py-2 text-sm">
        <SlidersHorizontal className="w-4 h-4" /> Adjust stock
      </button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title="Adjust stock" className="max-w-md">
        <form onSubmit={save} className="space-y-4">
          {!variant ? (
            <div>
              <Field label="Find the item" htmlFor="adj-q" hint="Product name, or type or scan the barcode">
                <input id="adj-q" autoFocus className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} />
              </Field>
              {q.trim().length >= 2 && (
                <ul className="mt-2 border border-gray-200 rounded-md divide-y max-h-64 overflow-y-auto">
                  {results.length === 0 && <li className="px-3 py-2 text-sm text-gray-500">No matches</li>}
                  {results.map((v) => (
                    <li key={v.barcode}>
                      <button type="button" onClick={() => setVariant(v)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                        {v.label}
                        <span className="block text-xs text-gray-500">{v.barcode} · {v.stock} in stock</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md bg-gray-50 px-3 py-2 text-sm flex justify-between gap-2">
                <span>
                  {variant.label}
                  <span className="block text-xs text-gray-500">{variant.stock} in stock now</span>
                </span>
                <button type="button" onClick={() => setVariant(null)} className="text-xs text-foreground">Change</button>
              </div>
              <div className="flex gap-2">
                {(["remove", "add"] as const).map((d) => (
                  <button key={d} type="button" onClick={() => setDirection(d)} className={cn("flex-1 rounded-md border py-2 text-sm", direction === d ? "border-foreground bg-foreground text-white" : "border-gray-300")}>
                    {d === "remove" ? "Remove pieces" : "Add pieces"}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="How many" htmlFor="adj-qty">
                  <input id="adj-qty" type="number" min={1} className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} />
                </Field>
                <Field label="Reason" htmlFor="adj-reason">
                  <select id="adj-reason" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
                    {ADJUSTMENT_REASONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Note (optional)" htmlFor="adj-note">
                <input id="adj-note" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <p className="text-xs text-gray-500">
                Stock will be {Math.max(0, variant.stock + (direction === "add" ? 1 : -1) * (Math.floor(Number(qty)) || 0))} for the shop and the website.
              </p>
              <button type="submit" disabled={busy || !(Number(qty) >= 1)} className="w-full rounded-md bg-foreground text-white py-2.5 text-sm disabled:opacity-50">
                {busy ? "Saving…" : "Save adjustment"}
              </button>
            </>
          )}
        </form>
      </Modal>
    </>
  );
}
