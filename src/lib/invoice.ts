import { buildBill, formatINR } from "@/lib/bill";
import { siteConfig } from "@/lib/site-config";

// A standalone, print-ready invoice page. It is served as plain HTML so it
// prints cleanly on A4 (no site header or admin sidebar). "Save as PDF" in the
// browser's print dialog produces the downloadable file.

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface InvoiceOrder {
  orderNumber: string;
  createdAt: Date | string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  shippingAddress: unknown;
  items: { id?: string; name: string; variantName?: string | null; quantity: number; price: number; mrp?: number | null }[];
  subtotal: number;
  discount: number;
  manualDiscount?: number;
  shipping: number;
  total: number;
  couponCode?: string | null;
  /** Shop bills: where and how it was paid. */
  channel?: string;
  payments?: { method: string; amount: number; tendered?: number | null; reference?: string | null }[];
  cashier?: { name: string | null; email: string | null } | null;
  payment?: {
    method: string;
    status: string;
    razorpayPaymentId?: string | null;
  } | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  CAPTURED: "Paid",
  UNPAID: "Unpaid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially refunded",
};

export function renderInvoiceHtml(order: InvoiceOrder, options: { autoPrint?: boolean } = {}): string {
  const bill = buildBill(order);
  const address = (typeof order.shippingAddress === "string" ? JSON.parse(order.shippingAddress) : order.shippingAddress) as
    | Record<string, string>
    | null;
  const date = new Date(order.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  const hasSale = bill.lines.some((l) => l.onSale);

  const rows = bill.lines
    .map(
      (line, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td><strong>${esc(line.name)}</strong>${line.variantName ? `<div class="muted">Size: ${esc(line.variantName)}</div>` : ""}</td>
        <td class="num">${line.quantity}</td>
        <td class="right">${line.onSale ? `<span class="strike">${formatINR(line.unitMrp)}</span> ` : ""}${formatINR(line.unitPrice)}</td>
        <td class="right">${formatINR(line.lineTotal)}</td>
      </tr>`
    )
    .join("");

  const summaryRows = [
    hasSale ? `<tr><td>Total at MRP</td><td class="right">${formatINR(bill.mrpTotal)}</td></tr>` : "",
    hasSale ? `<tr class="save"><td>Discount on MRP</td><td class="right">-${formatINR(bill.saleSavings)}</td></tr>` : "",
    `<tr><td>Subtotal</td><td class="right">${formatINR(bill.subtotal)}</td></tr>`,
    bill.couponDiscount > 0
      ? `<tr class="save"><td>Coupon discount${bill.couponCode ? ` (${esc(bill.couponCode)})` : ""}</td><td class="right">-${formatINR(bill.couponDiscount)}</td></tr>`
      : "",
    bill.manualDiscount > 0 ? `<tr class="save"><td>Discount at the counter</td><td class="right">-${formatINR(bill.manualDiscount)}</td></tr>` : "",
    `<tr><td>Shipping</td><td class="right">${bill.shipping === 0 ? "Free" : formatINR(bill.shipping)}</td></tr>`,
    `<tr class="grand"><td>Total</td><td class="right">${formatINR(bill.total)}</td></tr>`,
  ].join("");

  const savedLine =
    bill.totalSavings > 0
      ? `<p class="saved">You saved ${formatINR(bill.totalSavings)} on this order.</p>`
      : "";

  const isShop = order.channel === "POS";
  const SHOP_METHODS: Record<string, string> = { CASH: "Cash", UPI: "UPI", CARD: "Card" };
  const shopPayments = (order.payments ?? [])
    .map((p) => `${SHOP_METHODS[p.method] ?? p.method} ${formatINR(p.amount)}${p.reference ? ` (ref ${esc(p.reference)})` : ""}`)
    .join(" + ");
  const paymentMethod = isShop ? shopPayments || "-" : order.payment ? (order.payment.method === "COD" ? "Cash on delivery" : "Online payment") : "-";
  const paymentStatus = isShop ? (order.payments?.length ? "Paid" : "-") : order.payment ? PAYMENT_LABELS[order.payment.status] ?? order.payment.status : "-";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${esc(order.orderNumber)} - ${esc(siteConfig.brandName)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #f3f3f3; color: #111; font: 14px/1.5 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .page { max-width: 800px; margin: 24px auto; background: #fff; padding: 40px; border: 1px solid #e5e5e5; }
  header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111; padding-bottom: 20px; margin-bottom: 24px; }
  h1 { margin: 0; font-size: 26px; letter-spacing: 0.04em; text-transform: uppercase; }
  .brand p, .meta p { margin: 2px 0; }
  .meta { text-align: right; }
  .muted { color: #666; font-size: 12px; }
  .cols { display: flex; gap: 24px; margin-bottom: 24px; }
  .cols > div { flex: 1; background: #fafafa; border-radius: 6px; padding: 14px 16px; }
  h2 { margin: 0 0 6px; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #666; }
  .cols p { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; }
  .items th { text-align: left; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #666; padding: 8px 6px; border-bottom: 1px solid #ccc; }
  .items td { padding: 10px 6px; border-bottom: 1px solid #eee; vertical-align: top; }
  .num { text-align: center; width: 48px; }
  .items th.num { text-align: center; }
  .items th.right { text-align: right; }
  .right { text-align: right; white-space: nowrap; }
  .strike { text-decoration: line-through; color: #888; }
  .summary { width: 320px; margin: 20px 0 0 auto; }
  .summary td { padding: 6px 6px; }
  .summary .save td { color: #15803d; }
  .summary .grand td { border-top: 2px solid #111; font-size: 16px; font-weight: 700; padding-top: 10px; }
  .saved { text-align: right; color: #15803d; font-weight: 600; margin: 10px 0 0; }
  footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  footer p { margin: 2px 0; }
  .actions { max-width: 800px; margin: 16px auto 0; text-align: right; }
  .actions button { background: #111; color: #fff; border: 0; border-radius: 6px; padding: 10px 18px; font-size: 14px; cursor: pointer; }
  @media print {
    body { background: #fff; }
    .page { margin: 0; border: 0; padding: 0; max-width: none; }
    .actions { display: none; }
    @page { size: A4; margin: 16mm; }
  }
  @media (max-width: 600px) { .page { padding: 20px; } header, .cols { flex-direction: column; } .meta { text-align: left; } .summary { width: 100%; } }
</style>
</head>
<body>
<div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
<div class="page">
  <header>
    <div class="brand">
      <h1>${esc(siteConfig.brandName)}</h1>
      <p class="muted">${esc(siteConfig.registeredBusinessName)}</p>
      <p class="muted">${esc(siteConfig.operationalAddress)}</p>
      <p class="muted">${esc(siteConfig.supportEmail)} &middot; ${esc(siteConfig.supportPhone)}</p>
    </div>
    <div class="meta">
      <h2>Invoice</h2>
      <p><strong>${esc(order.orderNumber)}</strong></p>
      <p class="muted">Date: ${esc(date)}</p>
      <p class="muted">Payment: ${esc(paymentStatus)} (${isShop ? paymentMethod : esc(paymentMethod)})</p>
      ${isShop && order.cashier ? `<p class="muted">Served by: ${esc(order.cashier.name || order.cashier.email)}</p>` : ""}
      ${order.payment?.razorpayPaymentId ? `<p class="muted">Payment ID: ${esc(order.payment.razorpayPaymentId)}</p>` : ""}
    </div>
  </header>

  <div class="cols">
    <div>
      <h2>Billed to</h2>
      <p><strong>${esc(order.customerName)}</strong></p>
      <p>${esc(order.customerEmail)}</p>
      ${order.customerPhone ? `<p>${esc(order.customerPhone)}</p>` : ""}
    </div>
    <div>
      <h2>${isShop ? "Bought at" : "Shipped to"}</h2>
      ${
        address
          ? `<p><strong>${esc(address.name || order.customerName)}</strong></p>
      <p>${esc(address.street)}</p>
      <p>${esc(address.city)}, ${esc(address.state)} ${esc(address.pincode)}</p>
      ${address.phone ? `<p>Phone: ${esc(address.phone)}</p>` : ""}`
          : "<p>-</p>"
      }
    </div>
  </div>

  <table class="items">
    <thead><tr><th class="num">#</th><th>Item</th><th class="num">Qty</th><th class="right">Price</th><th class="right">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="summary"><tbody>${summaryRows}</tbody></table>
  ${savedLine}

  <footer>
    <p>Thank you for shopping with ${esc(siteConfig.brandName)}.</p>
    <p>Questions about this order? ${esc(siteConfig.supportEmail)} &middot; ${esc(siteConfig.supportPhone)} &middot; ${esc(siteConfig.supportHours)}</p>
    <p>This is a computer-generated invoice and does not need a signature.</p>
  </footer>
</div>
${options.autoPrint ? "<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });</script>" : ""}
</body>
</html>`;
}

/** Response headers for an invoice page: never cached, never indexed. */
export const invoiceHeaders = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex",
};
