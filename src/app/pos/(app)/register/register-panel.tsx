"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api-client";
import { fromPaise, toPaise } from "@/lib/money";
import { cn, formatPrice } from "@/lib/utils";

type Summary = {
  openedAt: string;
  openingCash: number;
  billCount: number;
  cancelledCount: number;
  sales: number;
  discounts: number;
  cash: number;
  upi: number;
  card: number;
  expectedCash: number;
  countedCash: number | null;
  difference: number | null;
  note: string | null;
};
type Recent = { id: string; openedAt: string; closedAt: string | null; openedBy: string | null; closedBy: string | null; expectedCash: number | null; countedCash: number | null; difference: number | null };

const field = "w-full h-12 border border-gray-300 rounded-lg px-3 text-lg tabular-nums bg-white focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground";
const when = (iso: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

/** Open the day with the cash in the drawer; close it by counting the cash. */
export function RegisterPanel({ summary, openedBy, lastCounted, recent }: { summary: Summary | null; openedBy: string | null; lastCounted: number | null; recent: Recent[] }) {
  const router = useRouter();
  const toast = useToast();
  const [opening, setOpening] = useState(lastCounted !== null ? String(lastCounted) : "");
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState<Summary | null>(null);

  const open = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/pos/register", { body: { openingCash: Number(opening) || 0 } });
      toast("The day is open. Happy selling!");
      router.push("/pos");
      router.refresh();
    } catch (err) {
      toast(errorMessage(err), "error");
      setBusy(false);
    }
  };

  const difference = summary && counted !== "" ? fromPaise(toPaise(Number(counted) || 0) - toPaise(summary.expectedCash)) : null;

  const close = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { summary: s } = await api<{ summary: Summary }>("/api/pos/register/close", { body: { countedCash: Number(counted) || 0, note: note.trim() || null } });
      setClosed(s);
      router.refresh();
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  if (closed) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h1 className="font-heading text-2xl mb-1">Day closed</h1>
          <p className="text-sm text-gray-500 mb-4">A summary has been emailed to the owner.</p>
          <Totals s={closed} />
        </div>
        <Link href="/pos" className="block text-center rounded-lg bg-foreground text-white h-12 leading-[3rem] font-medium">Done</Link>
      </div>
    );
  }

  if (!summary) {
    return (
      <form onSubmit={open} className="max-w-md mx-auto bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <h1 className="font-heading text-2xl">Open the day</h1>
          <p className="text-sm text-gray-500 mt-1">Count the cash in the drawer before the first bill.</p>
        </div>
        <div>
          <label htmlFor="opening" className="block text-sm font-medium mb-1">Opening cash (₹)</label>
          <input id="opening" inputMode="decimal" className={field} value={opening} onChange={(e) => setOpening(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
          {lastCounted !== null && <p className="text-xs text-gray-500 mt-1">Cash counted at the last close: {formatPrice(lastCounted)}</p>}
        </div>
        <button type="submit" disabled={busy} className="w-full h-12 rounded-lg bg-foreground text-white font-medium disabled:opacity-60">{busy ? "Opening…" : "Open the day"}</button>
        <RecentDays recent={recent} />
      </form>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h1 className="font-heading text-2xl">Close the day</h1>
        <p className="text-sm text-gray-500 mb-4">Opened {when(summary.openedAt)}{openedBy ? ` by ${openedBy}` : ""}</p>
        <Totals s={summary} />
      </div>
      <form onSubmit={close} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <label htmlFor="counted" className="block text-sm font-medium mb-1">Cash counted in the drawer (₹)</label>
          <input id="counted" inputMode="decimal" required className={field} value={counted} onChange={(e) => setCounted(e.target.value.replace(/[^\d.]/g, ""))} placeholder={String(summary.expectedCash)} />
        </div>
        {difference !== null && (
          <p className={cn("rounded-lg px-3 py-2 text-sm font-medium tabular-nums", difference === 0 ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900")}>
            {difference === 0 ? "Matches the expected cash." : difference > 0 ? `${formatPrice(difference)} more than expected` : `${formatPrice(-difference)} less than expected`}
          </p>
        )}
        {difference !== null && difference !== 0 && (
          <div>
            <label htmlFor="note" className="block text-sm font-medium mb-1">What happened? *</label>
            <textarea id="note" required rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base" placeholder="e.g. ₹200 taken out for tea and courier" />
          </div>
        )}
        <button type="submit" disabled={busy || counted === "" || (difference !== 0 && !note.trim())} className="w-full h-12 rounded-lg bg-foreground text-white font-medium disabled:opacity-50">
          {busy ? "Closing…" : "Close the day"}
        </button>
      </form>
    </div>
  );
}

function Totals({ s }: { s: Summary }) {
  const row = (label: string, value: string, strong = false) => (
    <div className={cn("flex justify-between py-1", strong && "font-semibold")}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
  return (
    <div className="text-sm divide-y divide-gray-100">
      <div className="pb-2">
        {row("Bills", `${s.billCount}${s.cancelledCount ? ` (+${s.cancelledCount} cancelled)` : ""}`)}
        {row("Sales", formatPrice(s.sales), true)}
        {s.discounts > 0 && row("Discounts given", formatPrice(s.discounts))}
      </div>
      <div className="py-2">
        {row("Cash", formatPrice(s.cash))}
        {row("UPI", formatPrice(s.upi))}
        {row("Card", formatPrice(s.card))}
      </div>
      <div className="pt-2">
        {row("Opening cash", formatPrice(s.openingCash))}
        {row("Expected in drawer", formatPrice(s.expectedCash), true)}
        {s.countedCash !== null && row("Counted", formatPrice(s.countedCash))}
        {s.difference !== null && s.difference !== 0 && row("Difference", `${s.difference > 0 ? "+" : "−"}${formatPrice(Math.abs(s.difference))}`)}
      </div>
    </div>
  );
}

function RecentDays({ recent }: { recent: Recent[] }) {
  const closed = recent.filter((r) => r.closedAt);
  if (!closed.length) return null;
  return (
    <div className="pt-2 border-t border-gray-100">
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Recent days</p>
      <ul className="text-sm space-y-1">
        {closed.slice(0, 5).map((r) => (
          <li key={r.id} className="flex justify-between gap-2 tabular-nums">
            <span>{new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" }).format(new Date(r.openedAt))}</span>
            <span className={cn(r.difference ? "text-amber-700" : "text-gray-600")}>
              {r.countedCash !== null ? formatPrice(r.countedCash) : "—"}
              {r.difference ? ` (${r.difference > 0 ? "+" : "−"}${formatPrice(Math.abs(r.difference))})` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
