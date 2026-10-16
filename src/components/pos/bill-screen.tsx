"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, PauseCircle, Percent, Plus, RotateCcw, Tag, Trash2, UserRound, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { ApiError, api, errorMessage } from "@/lib/api-client";
import { fromPaise, toPaise } from "@/lib/money";
import { cn, formatPrice } from "@/lib/utils";
import type { BillQuote, PosUnit } from "@/lib/pos/types";
import { ApprovalDialog, type Approval, type Approver } from "./approval-dialog";
import { PaymentSheet, type PaymentRow } from "./payment-sheet";
import { usePosUser } from "./pos-shell";
import { ScanBar, Thumb } from "./scan-bar";
import { loadLocal, saveLocal, useCatalog } from "./use-catalog";

type Line = { barcode: string; quantity: number; discount: number };
type DiscountInput = { mode: "%" | "₹"; value: string };
type Bill = {
  lines: Line[];
  customer: { phone: string; name: string; email: string };
  billDiscount: DiscountInput;
  couponCode: string;
  key: string; // idempotency key for this bill; kept until it's saved
};
type Held = { id: string; at: string; label: string; bill: Bill };
type Customer = { name: string | null; email: string | null; shopOrders: number; onlineOrders: number; totalSpent: number; lastPurchaseAt: string | null } | null;

const CURRENT_KEY = "rebel-pos-current-bill";
const HELD_KEY = "rebel-pos-held-bills";
const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const emptyBill = (): Bill => ({ lines: [], customer: { phone: "", name: "", email: "" }, billDiscount: { mode: "%", value: "" }, couponCode: "", key: newKey() });
const validPhone = (p: string) => /^[6-9]\d{9}$/.test(p);

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = 1400;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
    osc.onended = () => ctx.close();
  } catch {
    // no audio: fine
  }
}

/** ₹ amount for a "%" or "₹" discount input, given the amount it applies to (paise). */
function discountPaise(input: DiscountInput, basePaise: number) {
  const n = Number(input.value);
  if (!input.value || !Number.isFinite(n) || n <= 0) return 0;
  const rupees = input.mode === "%" ? Math.round((basePaise * Math.min(n, 100)) / 10_000) : Math.round(n);
  return Math.min(rupees * 100, basePaise);
}

/**
 * The billing counter. Everything shown is worked out on the device for speed; the server
 * re-prices the bill (coupon, discount limit, stock) before payment and again when saving.
 */
export function BillScreen({ upiId, storeName, registerOpen, approvers }: { upiId: string | null; storeName: string; registerOpen: boolean; approvers: Approver[] }) {
  const router = useRouter();
  const toast = useToast();
  const user = usePosUser();
  const catalog = useCatalog();
  const [bill, setBill] = useState<Bill>(emptyBill);
  const [held, setHeld] = useState<Held[]>([]);
  const [ready, setReady] = useState(false);
  const [customer, setCustomer] = useState<Customer | "loading" | "none">("none");
  const [quote, setQuote] = useState<BillQuote | null>(null);
  const [checking, setChecking] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<string | null>(null);
  const [couponDraft, setCouponDraft] = useState("");
  const [showHeld, setShowHeld] = useState(false);

  // Restore the bill in progress and held bills (per device), then keep them saved.
  useEffect(() => {
    queueMicrotask(() => {
      setBill(loadLocal<Bill | null>(CURRENT_KEY, null) ?? emptyBill());
      setHeld(loadLocal<Held[]>(HELD_KEY, []));
      setReady(true);
    });
  }, []);
  useEffect(() => {
    if (ready) saveLocal(CURRENT_KEY, bill.lines.length || bill.customer.phone ? bill : null);
  }, [bill, ready]);
  useEffect(() => {
    if (ready) saveLocal(HELD_KEY, held);
  }, [held, ready]);

  const byCode = useMemo(() => new Map(catalog.units.map((u) => [u.barcode, u])), [catalog.units]);

  // --- Lines -----------------------------------------------------------------
  const add = useCallback(
    (v: PosUnit) => {
      setBill((b) => {
        const existing = b.lines.find((l) => l.barcode === v.barcode);
        const lines = existing ? b.lines.map((l) => (l.barcode === v.barcode ? { ...l, quantity: l.quantity + 1 } : l)) : [...b.lines, { barcode: v.barcode, quantity: 1, discount: 0 }];
        return { ...b, lines };
      });
      beep();
      const already = bill.lines.find((l) => l.barcode === v.barcode)?.quantity ?? 0;
      if (already + 1 > v.stock) toast(`${v.name}${v.size ? ` (${v.size})` : ""}: only ${v.stock} in stock`, "error");
    },
    [bill.lines, toast]
  );

  const unknown = useCallback(
    async (code: string) => {
      // Maybe a product added in the admin panel after the list was loaded: refresh once.
      const fresh = await catalog.refresh();
      const hit = fresh.find((v) => v.barcode === code || v.codes.includes(code));
      if (hit) add(hit);
      else toast(`No product with the code "${code}"`, "error");
    },
    [catalog, add, toast]
  );

  const setQty = (barcode: string, quantity: number) =>
    setBill((b) => ({ ...b, lines: quantity <= 0 ? b.lines.filter((l) => l.barcode !== barcode) : b.lines.map((l) => (l.barcode === barcode ? { ...l, quantity } : l)) }));
  const setLineDiscount = (barcode: string, discount: number) => setBill((b) => ({ ...b, lines: b.lines.map((l) => (l.barcode === barcode ? { ...l, discount } : l)) }));

  // --- Totals (on device) ----------------------------------------------------
  const view = bill.lines.map((l) => {
    const v = byCode.get(l.barcode);
    const gross = v ? toPaise(v.price) * l.quantity : 0;
    return { ...l, v, gross, discountPaise: Math.min(toPaise(l.discount), gross) };
  });
  const subtotal = view.reduce((s, l) => s + l.gross, 0);
  const lineDiscounts = view.reduce((s, l) => s + l.discountPaise, 0);
  const billDiscount = discountPaise(bill.billDiscount, subtotal - lineDiscounts);
  const couponDiscount = bill.couponCode && quote?.couponCode === bill.couponCode ? toPaise(quote.couponDiscount) : 0;
  const manual = lineDiscounts + billDiscount;
  const afterDiscount = Math.max(0, subtotal - manual - couponDiscount);
  const total = afterDiscount;
  const manualPercent = subtotal ? (manual / subtotal) * 100 : 0;
  const overLimit = manualPercent > user.maxDiscountPercent + 1e-9;
  const itemCount = view.reduce((s, l) => s + l.quantity, 0);
  const missing = view.some((l) => !l.v);

  const requestBody = useCallback(
    () => ({
      lines: bill.lines.map((l) => ({ barcode: l.barcode, quantity: l.quantity, discount: l.discount })),
      billDiscount: fromPaise(billDiscount),
      couponCode: bill.couponCode || null,
    }),
    [bill.lines, bill.couponCode, billDiscount]
  );

  // Coupon discount comes from the server; re-quote when the bill changes.
  useEffect(() => {
    if (!bill.couponCode || !bill.lines.length) return;
    const t = setTimeout(() => {
      api<{ quote: BillQuote }>("/api/pos/bills/quote", { body: { ...requestBody(), customer: validPhone(bill.customer.phone) ? { phone: bill.customer.phone } : undefined } })
        .then(({ quote }) => setQuote(quote))
        .catch(() => undefined);
    }, 400);
    return () => clearTimeout(t);
  }, [bill.couponCode, bill.lines, bill.customer.phone, requestBody]);

  // --- Customer (phone is required on every bill) ------------------------------
  useEffect(() => {
    const phone = bill.customer.phone;
    if (!validPhone(phone)) {
      queueMicrotask(() => setCustomer("none"));
      return;
    }
    let cancelled = false;
    queueMicrotask(() => setCustomer("loading"));
    api<{ customer: Customer }>(`/api/pos/customers?phone=${phone}`)
      .then(({ customer: c }) => {
        if (cancelled) return;
        setCustomer(c);
        if (c) setBill((b) => ({ ...b, customer: { ...b.customer, name: b.customer.name || c.name || "", email: b.customer.email || c.email || "" } }));
      })
      .catch(() => !cancelled && setCustomer(null));
    return () => {
      cancelled = true;
    };
  }, [bill.customer.phone]);

  // --- Hold / recall -----------------------------------------------------------
  const hold = () => {
    if (!bill.lines.length) return;
    const label = `${bill.customer.name || bill.customer.phone || "Customer"} · ${itemCount} item${itemCount === 1 ? "" : "s"} · ${formatPrice(fromPaise(total))}`;
    setHeld((h) => [{ id: newKey(), at: new Date().toISOString(), label, bill }, ...h].slice(0, 20));
    setBill(emptyBill());
    setQuote(null);
    setApproval(null);
    toast("Bill put on hold");
  };
  const recall = (h: Held) => {
    if (bill.lines.length) hold();
    setHeld((list) => list.filter((x) => x.id !== h.id));
    setBill(h.bill);
    setQuote(null);
    setApproval(null);
    setShowHeld(false);
  };
  const clear = () => {
    if (bill.lines.length && !confirm("Clear this bill?")) return;
    setBill(emptyBill());
    setQuote(null);
    setApproval(null);
  };

  // --- Pay ---------------------------------------------------------------------
  const startPayment = async (withApproval: Approval | null = approval) => {
    if (!validPhone(bill.customer.phone)) return toast("Enter the customer's 10-digit mobile number", "error");
    setChecking(true);
    try {
      const { quote: q } = await api<{ quote: BillQuote }>("/api/pos/bills/quote", { body: { ...requestBody(), customer: { phone: bill.customer.phone } } });
      setQuote(q);
      if (q.stockIssues.length) {
        catalog.refresh();
        return toast(q.stockIssues.join(". "), "error");
      }
      if (q.couponError) return toast(q.couponError, "error");
      if (q.needsApproval && !withApproval) {
        setApprovalError(null);
        setApprovalOpen(true);
        return;
      }
      setPayOpen(true);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setChecking(false);
    }
  };

  const save = async (payments: PaymentRow[]) => {
    setSaving(true);
    try {
      const res = await api<{ id: string; billNumber: string; emailed: boolean }>("/api/pos/bills", {
        body: {
          idempotencyKey: bill.key,
          customer: { phone: bill.customer.phone, name: bill.customer.name || null, email: bill.customer.email || null },
          ...requestBody(),
          payments,
          approval: approval ?? undefined,
        },
      });
      saveLocal(CURRENT_KEY, null);
      setBill(emptyBill());
      setQuote(null);
      setApproval(null);
      setPayOpen(false);
      catalog.refresh();
      router.push(`/pos/bills/${res.id}?new=1${res.emailed ? "&emailed=1" : ""}`);
    } catch (e) {
      setSaving(false);
      // Approval missing, or the approver's PIN / limit no longer holds: ask again.
      if (e instanceof ApiError && (e.code === "APPROVAL_REQUIRED" || (approval && (e.status === 401 || e.status === 403)))) {
        setPayOpen(false);
        setApproval(null);
        setApprovalError(e.code === "APPROVAL_REQUIRED" ? null : e.message);
        setApprovalOpen(true);
        return;
      }
      if (e instanceof ApiError && e.code === "STOCK_CONFLICT") catalog.refresh();
      toast(errorMessage(e), "error");
    }
  };

  if (!registerOpen) {
    return (
      <div className="max-w-md mx-auto text-center bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <p className="text-lg font-medium">Open the day before billing</p>
        <p className="text-sm text-gray-500">Enter the cash in the drawer to start today&apos;s billing.</p>
        <Link href="/pos/register" className="inline-block rounded-lg bg-foreground text-white px-5 py-3 font-medium">Open the day</Link>
      </div>
    );
  }

  return (
    <div className="pb-28 lg:pb-0">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h1 className="font-heading text-2xl">New bill</h1>
        <div className="flex gap-2">
          {held.length > 0 && (
            <button onClick={() => setShowHeld((s) => !s)} className="inline-flex items-center gap-1.5 rounded-lg border border-primary bg-primary/10 px-3 py-2 text-sm text-foreground">
              <RotateCcw className="w-4 h-4" /> Held ({held.length})
            </button>
          )}
          {bill.lines.length > 0 && (
            <button onClick={clear} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600" aria-label="Clear bill">
              Clear
            </button>
          )}
        </div>
      </div>

      {showHeld && (
        <ul className="mb-3 bg-white border border-gray-200 rounded-xl divide-y">
          {held.map((h) => (
            <li key={h.id} className="flex items-center gap-2 px-3 py-2">
              <button onClick={() => recall(h)} className="flex-1 text-left text-sm">
                <span className="font-medium">{h.label}</span>
                <span className="block text-xs text-gray-500">Held at {new Date(h.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
              </button>
              <button onClick={() => setHeld((list) => list.filter((x) => x.id !== h.id))} className="p-2 text-gray-400 hover:text-red-600" aria-label="Discard held bill">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        {/* Left: scanning + items */}
        <div className="space-y-3 min-w-0">
          <ScanBar lookup={catalog.lookup} search={catalog.search} onPick={add} onUnknown={unknown} />
          {catalog.error && !catalog.units.length && <p className="text-sm text-red-600">{catalog.error}</p>}

          <section className="bg-white border border-gray-200 rounded-xl">
            {view.length === 0 ? (
              <p className="text-center text-gray-500 py-12 px-4 text-sm">Scan a tag to add it to the bill.<br />Scanning the same tag again adds one more.</p>
            ) : (
              <ul className="divide-y">
                {view.map((l) => (
                  <li key={l.barcode} className="p-3">
                    <div className="flex gap-3">
                      <Thumb src={l.v?.imageUrl ?? null} alt={l.v?.name ?? ""} size={52} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium leading-snug truncate">{l.v?.name ?? "Item no longer available"}</p>
                        <p className="text-xs text-gray-500 truncate">{l.v ? (l.v.size ? `Size ${l.v.size}` : "No size") : "Remove it and scan again"}</p>
                        <p className="text-sm tabular-nums mt-0.5">
                          {l.v && formatPrice(l.v.price)}
                          {l.v && l.v.mrp > l.v.price && <span className="ml-1.5 text-xs text-gray-400 line-through">{formatPrice(l.v.mrp)}</span>}
                          {l.v && l.quantity > l.v.stock && <span className="ml-2 text-xs text-red-600">Only {l.v.stock} in stock</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums">{formatPrice(fromPaise(l.gross - l.discountPaise))}</p>
                        {l.discountPaise > 0 && <p className="text-xs text-green-700 tabular-nums">− {formatPrice(fromPaise(l.discountPaise))}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button onClick={() => setQty(l.barcode, l.quantity - 1)} className="p-2.5" aria-label="One less"><Minus className="w-4 h-4" /></button>
                        <span className="w-8 text-center tabular-nums font-medium" aria-label="Quantity">{l.quantity}</span>
                        <button onClick={() => setQty(l.barcode, l.quantity + 1)} className="p-2.5" aria-label="One more"><Plus className="w-4 h-4" /></button>
                      </div>
                      <button onClick={() => setEditingDiscount(editingDiscount === l.barcode ? null : l.barcode)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600">
                        <Tag className="w-4 h-4" /> Discount
                      </button>
                      <div className="flex-1" />
                      <button onClick={() => setQty(l.barcode, 0)} className="p-2.5 text-gray-400 hover:text-red-600" aria-label="Remove item"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {editingDiscount === l.barcode && (
                      <LineDiscount gross={l.gross} current={l.discount} onApply={(d) => { setLineDiscount(l.barcode, d); setEditingDiscount(null); }} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right: customer, discounts, totals */}
        <div className="space-y-3">
          <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h2 className="font-medium flex items-center gap-2"><UserRound className="w-4 h-4 text-foreground" /> Customer</h2>
            <div>
              <label htmlFor="cust-phone" className="block text-xs text-gray-500 mb-1">Mobile number *</label>
              <input
                id="cust-phone"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                value={bill.customer.phone}
                onChange={(e) => setBill((b) => ({ ...b, customer: { ...b.customer, phone: e.target.value.replace(/\D/g, "").slice(0, 10) } }))}
                className="w-full h-11 border border-gray-300 rounded-lg px-3 text-base tabular-nums tracking-wider focus:outline-none focus:border-foreground"
                placeholder="10-digit mobile"
              />
              {bill.customer.phone.length === 10 && !validPhone(bill.customer.phone) && <p className="text-xs text-red-600 mt-1">Enter a valid Indian mobile number</p>}
            </div>
            {customer === "loading" && <p className="text-xs text-gray-500">Looking up…</p>}
            {customer && typeof customer === "object" && (
              <p className="text-xs bg-green-50 text-green-900 rounded-md px-2.5 py-2">
                Returning customer · {customer.shopOrders} shop / {customer.onlineOrders} online purchase{customer.shopOrders + customer.onlineOrders === 1 ? "" : "s"} · {formatPrice(customer.totalSpent)} spent
              </p>
            )}
            {customer === null && validPhone(bill.customer.phone) && <p className="text-xs text-gray-500">New customer: add a name, and an email to send the bill.</p>}
            {validPhone(bill.customer.phone) && (
              <div className="grid grid-cols-1 gap-2">
                <input aria-label="Customer name" value={bill.customer.name} onChange={(e) => setBill((b) => ({ ...b, customer: { ...b.customer, name: e.target.value } }))} placeholder="Name (optional)" className="w-full h-11 border border-gray-300 rounded-lg px-3 text-base focus:outline-none focus:border-foreground" />
                <input aria-label="Customer email" type="email" inputMode="email" value={bill.customer.email} onChange={(e) => setBill((b) => ({ ...b, customer: { ...b.customer, email: e.target.value.trim() } }))} placeholder="Email for the bill (optional)" className="w-full h-11 border border-gray-300 rounded-lg px-3 text-base focus:outline-none focus:border-foreground" />
              </div>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h2 className="font-medium flex items-center gap-2"><Percent className="w-4 h-4 text-foreground" /> Discount</h2>
            <div className="flex gap-2">
              <div className="flex rounded-lg border border-gray-300 overflow-hidden shrink-0" role="radiogroup" aria-label="Discount type">
                {(["%", "₹"] as const).map((m) => (
                  <button key={m} role="radio" aria-checked={bill.billDiscount.mode === m} onClick={() => setBill((b) => ({ ...b, billDiscount: { ...b.billDiscount, mode: m } }))} className={cn("w-11 h-11 text-sm font-medium", bill.billDiscount.mode === m ? "bg-foreground text-white" : "bg-white")}>
                    {m}
                  </button>
                ))}
              </div>
              <input aria-label="Bill discount" inputMode="decimal" value={bill.billDiscount.value} onChange={(e) => setBill((b) => ({ ...b, billDiscount: { ...b.billDiscount, value: e.target.value.replace(/[^\d.]/g, "") } }))} placeholder="Bill discount" className="flex-1 min-w-0 h-11 border border-gray-300 rounded-lg px-3 text-base tabular-nums focus:outline-none focus:border-foreground" />
            </div>
            <p className={cn("text-xs", overLimit ? "text-amber-700" : "text-gray-500")}>
              {overLimit ? `Total discount ${manualPercent.toFixed(1)}% is above your ${user.maxDiscountPercent}% limit: a manager will approve it at payment.` : `Your limit: ${user.maxDiscountPercent}% of the bill.`}
            </p>
            {bill.couponCode ? (
              <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-sm">
                <span>Coupon <b>{bill.couponCode}</b>{quote?.couponError && quote.couponCode !== bill.couponCode ? <span className="block text-xs text-red-600">{quote.couponError}</span> : null}</span>
                <button onClick={() => { setBill((b) => ({ ...b, couponCode: "" })); setQuote(null); }} aria-label="Remove coupon" className="p-1"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (couponDraft.trim()) { setBill((b) => ({ ...b, couponCode: couponDraft.trim().toUpperCase() })); setCouponDraft(""); } }}>
                <input aria-label="Coupon code" value={couponDraft} onChange={(e) => setCouponDraft(e.target.value.toUpperCase())} placeholder="Coupon code" className="flex-1 min-w-0 h-11 border border-gray-300 rounded-lg px-3 text-base uppercase focus:outline-none focus:border-foreground" />
                <button type="submit" className="rounded-lg border border-foreground text-foreground px-4 text-sm font-medium">Apply</button>
              </form>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-4 text-sm space-y-1.5 tabular-nums">
            <Row label={`Items (${itemCount})`} value={formatPrice(fromPaise(subtotal))} />
            {manual > 0 && <Row label="Discount" value={`− ${formatPrice(fromPaise(manual))}`} tone="green" />}
            {couponDiscount > 0 && <Row label={`Coupon ${bill.couponCode}`} value={`− ${formatPrice(fromPaise(couponDiscount))}`} tone="green" />}
            <div className="flex justify-between pt-2 mt-1 border-t text-lg font-semibold">
              <span>Total</span>
              <span>{formatPrice(fromPaise(total))}</span>
            </div>
            <p className="text-xs text-gray-500">Prices include all taxes.</p>
            <div className="hidden lg:flex gap-2 pt-3">
              <PayButtons onHold={hold} onPay={() => startPayment()} disabled={!bill.lines.length || missing} busy={checking} total={fromPaise(total)} canPay={validPhone(bill.customer.phone)} />
            </div>
          </section>
        </div>
      </div>

      {/* Phone / tablet: sticky pay bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200 px-3 py-3 flex gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <PayButtons onHold={hold} onPay={() => startPayment()} disabled={!bill.lines.length || missing} busy={checking} total={fromPaise(total)} canPay={validPhone(bill.customer.phone)} />
      </div>

      {approvalOpen && (
        <ApprovalDialog
          open
          title="Manager approval"
          reason={`The discount (${(quote?.manualPercent ?? manualPercent).toFixed(1)}%) is above ${user.name}'s limit of ${user.maxDiscountPercent}%.`}
          approvers={approvers.filter((a) => a.id !== user.id)}
          error={approvalError}
          onClose={() => setApprovalOpen(false)}
          onApprove={async (a) => {
            try {
              await api("/api/pos/auth/approve", { body: { ...a, discountPercent: quote?.manualPercent ?? manualPercent } });
              setApproval(a);
              setApprovalOpen(false);
              setPayOpen(true);
            } catch (e) {
              setApprovalError(errorMessage(e));
            }
          }}
        />
      )}
      {payOpen && quote && (
        <PaymentSheet open total={quote.total} upiId={upiId} payee={storeName} busy={saving} onClose={() => !saving && setPayOpen(false)} onConfirm={save} />
      )}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "green" }) {
  return (
    <div className={cn("flex justify-between", tone === "green" && "text-green-700")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function PayButtons({ onHold, onPay, disabled, busy, total, canPay }: { onHold: () => void; onPay: () => void; disabled: boolean; busy: boolean; total: number; canPay: boolean }) {
  return (
    <>
      <button onClick={onHold} disabled={disabled} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-4 h-14 text-sm font-medium disabled:opacity-40">
        <PauseCircle className="w-5 h-5" /> Hold
      </button>
      <button onClick={onPay} disabled={disabled || busy} className="flex-1 rounded-xl bg-foreground text-white h-14 text-lg font-medium disabled:opacity-50">
        {busy ? "Checking…" : !canPay && !disabled ? "Add mobile no. to pay" : `Pay ${formatPrice(total)}`}
      </button>
    </>
  );
}

/** Discount on one line, as % or ₹ of that line. */
function LineDiscount({ gross, current, onApply }: { gross: number; current: number; onApply: (rupees: number) => void }) {
  const [input, setInput] = useState<DiscountInput>({ mode: "₹", value: current ? String(current) : "" });
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const amount = fromPaise(discountPaise(input, gross));
  return (
    <form className="flex items-center gap-2 mt-2" onSubmit={(e) => { e.preventDefault(); onApply(amount); }}>
      <div className="flex rounded-lg border border-gray-300 overflow-hidden shrink-0">
        {(["₹", "%"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setInput({ ...input, mode: m })} className={cn("w-10 h-10 text-sm", input.mode === m ? "bg-foreground text-white" : "bg-white")}>{m}</button>
        ))}
      </div>
      <input ref={ref} aria-label="Line discount" inputMode="decimal" value={input.value} onChange={(e) => setInput({ ...input, value: e.target.value.replace(/[^\d.]/g, "") })} className="w-24 h-10 border border-gray-300 rounded-lg px-2 text-base tabular-nums" />
      <span className="text-xs text-gray-500 tabular-nums">= {formatPrice(amount)}</span>
      <button type="submit" className="ml-auto rounded-lg bg-foreground text-white px-3 h-10 text-sm">Apply</button>
    </form>
  );
}
