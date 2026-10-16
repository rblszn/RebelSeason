"use client";

import { useEffect, useState } from "react";
import { Banknote, CreditCard, Plus, QrCode, Trash2 } from "lucide-react";
import QRCode from "qrcode";
import { Modal } from "@/components/ui/modal";
import { fromPaise, toPaise } from "@/lib/money";
import { cn, formatPrice } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS, type PaymentMethodType } from "@/lib/pos/types";

export type PaymentRow = { method: PaymentMethodType; amount: number; tendered?: number | null; reference?: string | null };

type Row = { method: PaymentMethodType; amount: string; tendered: string; reference: string };

const ICON = { CASH: Banknote, UPI: QrCode, CARD: CreditCard };
const field = "w-full border border-gray-300 rounded-lg px-3 h-11 text-base bg-white focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground tabular-nums";

/** UPI payment QR for the exact amount (any UPI app). Payment is confirmed by staff, not automatically. */
function UpiQr({ upiId, payee, amount }: { upiId: string; payee: string; amount: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const uri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent("Rebel Season bill")}`;
    QRCode.toDataURL(uri, { margin: 1, width: 220 }).then(setSrc).catch(() => setSrc(null));
  }, [upiId, payee, amount]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- generated data: URL
    <img src={src} alt={`UPI QR for ${formatPrice(amount)}`} width={180} height={180} className="mx-auto rounded border border-gray-200" />
  ) : null;
}

/**
 * Take payment for the bill: Cash (shows change), UPI (QR with the exact amount when a shop
 * UPI ID is set), Card (amount entered on the bank's machine), or split across several.
 */
export function PaymentSheet({
  open,
  total,
  upiId,
  payee,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  total: number;
  upiId: string | null;
  payee: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (payments: PaymentRow[]) => void;
}) {
  const [rows, setRows] = useState<Row[]>([{ method: "CASH", amount: String(total), tendered: "", reference: "" }]);
  const split = rows.length > 1;

  const paidPaise = rows.reduce((s, r) => s + toPaise(Number(r.amount) || 0), 0);
  const remaining = fromPaise(toPaise(total) - paidPaise);
  const cashRow = rows.find((r) => r.method === "CASH");
  const tendered = cashRow && cashRow.tendered ? Number(cashRow.tendered) : null;
  const change = cashRow && tendered !== null ? fromPaise(toPaise(tendered) - toPaise(Number(cashRow.amount) || 0)) : null;
  const valid =
    remaining === 0 &&
    rows.every((r) => Number(r.amount) > 0) &&
    (change === null || change >= 0);

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const single = (method: PaymentMethodType) => setRows([{ method, amount: String(total), tendered: "", reference: "" }]);

  const confirm = () => {
    if (!valid || busy) return;
    onConfirm(
      rows.map((r) => ({
        method: r.method,
        amount: Number(r.amount),
        tendered: r.method === "CASH" && r.tendered ? Number(r.tendered) : null,
        reference: r.reference.trim() || null,
      }))
    );
  };

  // Quick cash buttons: exact, then the next round notes.
  const quick = [...new Set([total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 2000) * 2000])].filter((v) => v >= total).slice(0, 4);

  return (
    <Modal open={open} onClose={onClose} title="Take payment" dismissible={!busy} className="max-w-md">
      <div className="text-center mb-4">
        <p className="text-xs uppercase tracking-wider text-gray-500">Bill total</p>
        <p className="text-4xl font-semibold tabular-nums">{formatPrice(total)}</p>
      </div>

      {!split && (
        <div className="grid grid-cols-3 gap-2 mb-4" role="radiogroup" aria-label="Payment method">
          {(["CASH", "UPI", "CARD"] as const).map((m) => {
            const Icon = ICON[m];
            const active = rows[0].method === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => single(m)}
                className={cn("flex flex-col items-center gap-1 rounded-xl border py-3 text-sm font-medium", active ? "border-foreground bg-foreground text-white" : "border-gray-200 bg-white")}
              >
                <Icon className="w-6 h-6" /> {PAYMENT_METHOD_LABELS[m]}
              </button>
            );
          })}
        </div>
      )}

      {!split ? (
        <div className="space-y-3">
          {rows[0].method === "CASH" && (
            <>
              <label className="block text-sm font-medium" htmlFor="cash-received">Cash received</label>
              <input id="cash-received" inputMode="decimal" className={field} value={rows[0].tendered} placeholder={String(total)} onChange={(e) => setRow(0, { tendered: e.target.value.replace(/[^\d.]/g, "") })} />
              <div className="flex flex-wrap gap-2">
                {quick.map((q) => (
                  <button key={q} type="button" onClick={() => setRow(0, { tendered: String(q) })} className="rounded-full border border-gray-300 px-3 py-1.5 text-sm tabular-nums hover:border-foreground">
                    {formatPrice(q)}
                  </button>
                ))}
              </div>
              {change !== null && (
                <p className={cn("rounded-lg px-3 py-2 text-lg font-semibold tabular-nums", change < 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800")}>
                  {change < 0 ? `${formatPrice(-change)} short` : `Give back ${formatPrice(change)}`}
                </p>
              )}
            </>
          )}
          {rows[0].method === "UPI" && (
            <div className="space-y-3 text-center">
              {upiId ? <UpiQr upiId={upiId} payee={payee} amount={total} /> : <p className="text-sm text-gray-500">Ask the customer to pay {formatPrice(total)} on the shop&apos;s UPI QR.</p>}
              <p className="text-sm text-gray-600">Confirm on the shop&apos;s UPI app or sound box that {formatPrice(total)} was received.</p>
              <input aria-label="UPI reference (optional)" className={field} placeholder="UPI reference (optional)" value={rows[0].reference} onChange={(e) => setRow(0, { reference: e.target.value })} />
            </div>
          )}
          {rows[0].method === "CARD" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Enter {formatPrice(total)} on the card machine. Confirm here once it&apos;s approved.</p>
              <input aria-label="Card approval code (optional)" className={field} placeholder="Approval code / last 4 digits (optional)" value={rows[0].reference} onChange={(e) => setRow(0, { reference: e.target.value })} />
            </div>
          )}
          <button type="button" onClick={() => setRows([{ ...rows[0], amount: "", tendered: "" }, { method: rows[0].method === "CASH" ? "UPI" : "CASH", amount: "", tendered: "", reference: "" }])} className="text-sm text-foreground hover:underline">
            Split between two payment methods
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select aria-label="Method" value={r.method} onChange={(e) => setRow(i, { method: e.target.value as PaymentMethodType })} className={cn(field, "w-28 shrink-0")}>
                {(["CASH", "UPI", "CARD"] as const).map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
              </select>
              <input aria-label="Amount" inputMode="decimal" className={field} placeholder="Amount" value={r.amount} onChange={(e) => setRow(i, { amount: e.target.value.replace(/[^\d.]/g, "") })} />
              {remaining > 0 && !Number(r.amount) && (
                <button type="button" onClick={() => setRow(i, { amount: String(remaining) })} className="shrink-0 text-xs text-foreground whitespace-nowrap">Rest</button>
              )}
              <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove payment" className="shrink-0 p-2 text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {rows.length < 5 && (
            <button type="button" onClick={() => setRows([...rows, { method: "CARD", amount: remaining > 0 ? String(remaining) : "", tendered: "", reference: "" }])} className="inline-flex items-center gap-1 text-sm text-foreground">
              <Plus className="w-4 h-4" /> Add another payment
            </button>
          )}
          <p className={cn("text-sm tabular-nums", remaining === 0 ? "text-green-700" : "text-amber-700")}>
            {remaining === 0 ? "Payments match the total." : remaining > 0 ? `${formatPrice(remaining)} still to pay` : `${formatPrice(-remaining)} more than the total`}
          </p>
          {upiId && rows.some((r) => r.method === "UPI" && Number(r.amount) > 0) && (
            <UpiQr upiId={upiId} payee={payee} amount={Number(rows.find((r) => r.method === "UPI")!.amount)} />
          )}
        </div>
      )}

      <button type="button" onClick={confirm} disabled={!valid || busy} className="mt-5 w-full h-14 rounded-xl bg-foreground text-white text-lg font-medium disabled:opacity-50">
        {busy ? "Saving bill…" : `Payment received · ${formatPrice(total)}`}
      </button>
    </Modal>
  );
}
