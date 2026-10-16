import { formatPrice } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS, type BillView, type StoreInfo } from "@/lib/pos/types";

const dateTime = (iso: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/**
 * The shop bill as an A4 page (screen + print). Prices include all taxes, so no tax lines
 * for now; the store's GSTIN is printed when one is set in POS settings.
 */
export function BillDocument({ bill, store }: { bill: BillView; store: StoreInfo }) {
  const cancelled = bill.status === "CANCELLED";
  return (
    <article className="bill relative bg-white text-foreground text-sm max-w-[210mm] mx-auto p-6 sm:p-10 print:p-0 shadow-sm print:shadow-none border border-gray-200 print:border-0 rounded-lg print:rounded-none">
      {cancelled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <span className="text-7xl font-bold text-red-600/15 -rotate-12 border-8 border-red-600/15 px-6 py-2 rounded-xl">CANCELLED</span>
        </div>
      )}
      <header className="flex justify-between items-start gap-4 border-b-2 border-primary pb-5 mb-5">
        <div>
          <p className="font-heading text-3xl leading-none">{store.storeName}</p>
          {store.address && <p className="mt-2 text-gray-600 max-w-xs">{store.address}</p>}
          <p className="text-gray-600">{[store.phone, store.email].filter(Boolean).join(" · ")}</p>
          {store.gstin && <p className="text-gray-600">GSTIN {store.gstin}</p>}
        </div>
        <div className="text-right shrink-0">
          <h1 className="font-heading text-2xl">{cancelled ? "Cancelled bill" : "Bill"}</h1>
          <p className="mt-1 font-medium tabular-nums">{bill.billNumber}</p>
          <p className="text-gray-600">{dateTime(bill.createdAt)}</p>
        </div>
      </header>

      <section className="flex flex-wrap justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-1">Customer</h2>
          {bill.customer.name && <p className="font-medium">{bill.customer.name}</p>}
          <p className="tabular-nums">+91 {bill.customer.phone}</p>
          {bill.customer.email && <p className="text-gray-600">{bill.customer.email}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-1">Served by</h2>
          <p>{bill.cashier ?? "—"}</p>
          {bill.approvedBy && <p className="text-xs text-gray-500">Discount approved by {bill.approvedBy}</p>}
        </div>
      </section>

      <table className="w-full mb-5">
        <thead>
          <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wider text-gray-500">
            <th className="py-2 font-medium">Item</th>
            <th className="py-2 font-medium text-right">Qty</th>
            <th className="py-2 font-medium text-right">Price</th>
            <th className="py-2 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((i) => (
            <tr key={i.id} className="border-b border-gray-100 align-top">
              <td className="py-2 pr-2">
                <p className="font-medium">{i.name}</p>
                <p className="text-xs text-gray-500">{i.size ? `Size ${i.size}` : null}</p>
                {i.discount > 0 && <p className="text-xs text-green-700">Discount − {money(i.discount)}</p>}
              </td>
              <td className="py-2 text-right tabular-nums">{i.quantity}</td>
              <td className="py-2 text-right tabular-nums whitespace-nowrap">
                {money(i.unitPrice)}
                {i.unitMrp > i.unitPrice && <span className="block text-xs text-gray-400 line-through">{money(i.unitMrp)}</span>}
              </td>
              <td className="py-2 text-right tabular-nums whitespace-nowrap">{money(i.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap justify-between gap-6">
        <div className="text-sm">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-1">Payment</h2>
          {bill.payments.map((p, idx) => (
            <p key={idx} className="tabular-nums">
              {PAYMENT_METHOD_LABELS[p.method]} {money(p.amount)}
              {p.tendered !== null && p.tendered > p.amount && <span className="text-gray-500"> (received {money(p.tendered)}, change {money(p.tendered - p.amount)})</span>}
              {p.reference && <span className="text-gray-500"> · Ref {p.reference}</span>}
            </p>
          ))}
        </div>
        <dl className="w-full sm:w-72 ml-auto space-y-1 tabular-nums">
          {bill.mrpSavings > 0 && (
            <>
              <div className="flex justify-between text-gray-600"><dt>Total at MRP</dt><dd className="line-through">{money(bill.subtotal + bill.mrpSavings)}</dd></div>
              <div className="flex justify-between text-green-700"><dt>Discount on MRP</dt><dd>− {money(bill.mrpSavings)}</dd></div>
            </>
          )}
          <div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd>{money(bill.subtotal)}</dd></div>
          {bill.couponDiscount > 0 && <div className="flex justify-between text-green-700"><dt>Coupon discount{bill.couponCode ? ` (${bill.couponCode})` : ""}</dt><dd>− {money(bill.couponDiscount)}</dd></div>}
          {bill.manualDiscount > 0 && <div className="flex justify-between text-green-700"><dt>Discount at the counter</dt><dd>− {money(bill.manualDiscount)}</dd></div>}
          <div className="flex justify-between border-t border-gray-300 pt-2 text-lg font-semibold"><dt>Total</dt><dd>{formatPrice(bill.total)}</dd></div>
          {bill.mrpSavings + bill.manualDiscount + bill.couponDiscount > 0 && <p className="text-xs text-green-700 text-right">You saved {money(bill.mrpSavings + bill.manualDiscount + bill.couponDiscount)} on this bill</p>}
        </dl>
      </div>

      <footer className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
        <p>{store.billFooter}</p>
        {cancelled && bill.cancelReason && <p className="mt-1 text-red-600">Cancelled{bill.cancelledAt ? ` on ${dateTime(bill.cancelledAt)}` : ""}: {bill.cancelReason}</p>}
      </footer>
    </article>
  );
}
