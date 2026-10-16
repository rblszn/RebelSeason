import Link from "next/link";
import { Download } from "lucide-react";
import { addDays, istDate, isIsoDate } from "@/lib/ist";
import { salesReport } from "@/lib/pos/reports";
import { Card, PageHeader, Stat, TableWrap, td, th } from "@/components/admin/ui";
import { cn, formatDate, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports | Admin" };

const PRESETS = [
  { key: "today", label: "Today", days: 0 },
  { key: "7d", label: "Last 7 days", days: 6 },
  { key: "30d", label: "Last 30 days", days: 29 },
] as const;

/** Sales for a date range: online vs shop, by day, payment, category, staff and product. */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const today = istDate();
  const monthStart = `${today.slice(0, 8)}01`;
  let to = isIsoDate(sp.to) && sp.to <= today ? sp.to : today;
  let from = isIsoDate(sp.from) ? sp.from : addDays(to, -6);
  if (from > to) [from, to] = [to, from];
  if (Date.parse(to) - Date.parse(from) > 366 * 86_400_000) from = addDays(to, -366);
  const r = await salesReport(from, to);

  const maxDay = Math.max(1, ...r.daily.map((d) => d.online + d.shop));
  const presetHref = (days: number) => `/admin/reports?from=${addDays(today, -days)}&to=${today}`;

  return (
    <div className="p-6">
      <PageHeader
        title="Reports"
        description={`${formatDate(`${from}T12:00:00+05:30`)} – ${formatDate(`${to}T12:00:00+05:30`)} · shop and website together`}
        actions={
          <a href={`/api/admin/reports/export?from=${from}&to=${to}`} className="inline-flex items-center gap-2 border border-gray-300 bg-white rounded-md px-3 py-2 text-sm hover:border-foreground">
            <Download className="w-4 h-4" /> Export to Excel (CSV)
          </a>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-6 text-sm">
        {PRESETS.map((p) => (
          <Link key={p.key} href={presetHref(p.days)} className={cn("rounded-full border px-3 py-1.5", from === addDays(today, -p.days) && to === today ? "border-foreground bg-foreground text-white" : "border-gray-300 bg-white")}>
            {p.label}
          </Link>
        ))}
        <Link href={`/admin/reports?from=${monthStart}&to=${today}`} className={cn("rounded-full border px-3 py-1.5", from === monthStart && to === today ? "border-foreground bg-foreground text-white" : "border-gray-300 bg-white")}>
          This month
        </Link>
        <form className="flex items-center gap-2 ml-auto">
          <input type="date" name="from" defaultValue={from} max={today} aria-label="From" className="border border-gray-300 rounded-md px-2 py-1.5 bg-white" />
          <span className="text-gray-400">to</span>
          <input type="date" name="to" defaultValue={to} max={today} aria-label="To" className="border border-gray-300 rounded-md px-2 py-1.5 bg-white" />
          <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5">Show</button>
        </form>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Total sales" value={formatPrice(r.totals.sales)} hint={`${r.totals.orders} order${r.totals.orders === 1 ? "" : "s"} & bills`} />
        <Stat label="Shop (POS)" value={formatPrice(r.totals.shop.sales)} hint={`${r.totals.shop.bills} bill${r.totals.shop.bills === 1 ? "" : "s"}`} />
        <Stat label="Website" value={formatPrice(r.totals.online.sales)} hint={`${r.totals.online.orders} order${r.totals.online.orders === 1 ? "" : "s"}`} />
        <Stat label="Discounts given" value={formatPrice(r.totals.shopDiscounts + r.totals.couponDiscounts)} hint={`Shop ${formatPrice(r.totals.shopDiscounts)} · coupons ${formatPrice(r.totals.couponDiscounts)}`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card title="Sales by day" className="lg:col-span-2">
          <ul className="space-y-1.5 text-sm max-h-96 overflow-y-auto">
            {r.daily.map((d) => (
              <li key={d.day} className="grid grid-cols-[5.5rem_1fr_5.5rem] items-center gap-3">
                <span className="text-xs text-gray-500 tabular-nums">{formatDate(`${d.day}T12:00:00+05:30`)}</span>
                <span className="flex h-4 rounded overflow-hidden bg-gray-100" role="img" aria-label={`Shop ${formatPrice(d.shop)}, website ${formatPrice(d.online)}`}>
                  <span className="bg-foreground" style={{ width: `${(d.shop / maxDay) * 100}%` }} />
                  <span className="bg-primary" style={{ width: `${(d.online / maxDay) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums">{formatPrice(d.shop + d.online)}</span>
              </li>
            ))}
          </ul>
          <p className="flex gap-4 text-xs text-gray-500 mt-3">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-foreground" /> Shop</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary" /> Website</span>
          </p>
        </Card>
        <Card title="Payments">
          <dl className="space-y-2 text-sm">
            {r.payments.map((p) => (
              <div key={p.label} className="flex justify-between"><dt className="text-gray-600">{p.label}</dt><dd className="tabular-nums font-medium">{formatPrice(p.amount)}</dd></div>
            ))}
          </dl>
          <div className="mt-4 pt-4 border-t border-gray-100 text-sm space-y-1">
            <p className="flex justify-between"><span className="text-gray-600">Cancelled shop bills</span><span className="tabular-nums">{r.totals.cancelled.shop} ({formatPrice(r.totals.cancelled.shopAmount)})</span></p>
            <p className="flex justify-between"><span className="text-gray-600">Cancelled online orders</span><span className="tabular-nums">{r.totals.cancelled.online}</span></p>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card title="By category">
          {r.categories.length === 0 ? <p className="text-sm text-gray-500">No sales in this period.</p> : (
            <div className="-m-5"><TableWrap>
              <thead><tr><th className={th}>Category</th><th className={`${th} text-right`}>Pieces</th><th className={`${th} text-right`}>Sales</th></tr></thead>
              <tbody>{r.categories.map((c) => <tr key={c.name}><td className={td}>{c.name}</td><td className={`${td} text-right tabular-nums`}>{c.qty}</td><td className={`${td} text-right tabular-nums`}>{formatPrice(c.revenue)}</td></tr>)}</tbody>
            </TableWrap></div>
          )}
        </Card>
        <Card title="Best sellers">
          {r.topProducts.length === 0 ? <p className="text-sm text-gray-500">No sales in this period.</p> : (
            <div className="-m-5"><TableWrap>
              <thead><tr><th className={th}>Product</th><th className={`${th} text-right`}>Shop</th><th className={`${th} text-right`}>Online</th><th className={`${th} text-right`}>Sales</th></tr></thead>
              <tbody>{r.topProducts.map((p) => <tr key={p.name}><td className={td}>{p.name}</td><td className={`${td} text-right tabular-nums`}>{p.shop}</td><td className={`${td} text-right tabular-nums`}>{p.online}</td><td className={`${td} text-right tabular-nums`}>{formatPrice(p.revenue)}</td></tr>)}</tbody>
            </TableWrap></div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Shop sales by staff">
          {r.staff.length === 0 ? <p className="text-sm text-gray-500">No shop bills in this period.</p> : (
            <div className="-m-5"><TableWrap>
              <thead><tr><th className={th}>Staff</th><th className={`${th} text-right`}>Bills</th><th className={`${th} text-right`}>Discounts</th><th className={`${th} text-right`}>Sales</th></tr></thead>
              <tbody>{r.staff.map((s) => <tr key={s.name}><td className={td}>{s.name}</td><td className={`${td} text-right tabular-nums`}>{s.bills}</td><td className={`${td} text-right tabular-nums`}>{formatPrice(s.discounts)}</td><td className={`${td} text-right tabular-nums`}>{formatPrice(s.sales)}</td></tr>)}</tbody>
            </TableWrap></div>
          )}
        </Card>
        <Card title={`Stock on hand · ${r.stock.units} pieces · ${formatPrice(r.stock.value)}`}>
          <p className="text-xs text-gray-500 mb-3">At selling price (MRP value {formatPrice(r.stock.mrpValue)}). Below: items in stock with no sales in this period, highest value first.</p>
          {r.slowMoving.length === 0 ? <p className="text-sm text-gray-500">Everything in stock sold at least once in this period.</p> : (
            <ul className="divide-y text-sm">
              {r.slowMoving.map((v) => (
                <li key={v.id} className="flex justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <Link href={`/admin/products/${v.productId}`} className="hover:text-foreground">{v.name}</Link>
                    <span className="block text-xs text-gray-500">{v.variant || "—"} · last sold {v.lastSold ? formatDate(v.lastSold) : "never"}</span>
                  </span>
                  <span className="text-right tabular-nums shrink-0">{v.stock} pcs<span className="block text-xs text-gray-500">{formatPrice(v.value)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
