import Link from "next/link";
import type { StockReason } from "@prisma/client";
import { isIsoDate } from "@/lib/ist";
import { listStockMovements, STOCK_REASON_LABELS } from "@/lib/pos/stock";
import { SearchInput, SelectFilter } from "@/components/admin/list-controls";
import { PageHeader, Pill, TableWrap, td, th } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/Pagination";
import { formatDateTime } from "@/lib/utils";
import { AdjustStock } from "./adjust-stock";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stock history | Admin" };

const REASONS = Object.keys(STOCK_REASON_LABELS) as StockReason[];
const tone: Record<StockReason, "gray" | "green" | "amber" | "red" | "gold"> = {
  INITIAL: "gray",
  ONLINE_SALE: "gold",
  POS_SALE: "gold",
  RECEIVED: "green",
  ADJUSTMENT: "amber",
  CANCEL: "green",
};

/** Every stock change (online sale, shop sale, received, adjusted, cancelled), newest first. */
export default async function StockHistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const reason = REASONS.includes(sp.reason as StockReason) ? (sp.reason as StockReason) : undefined;
  const from = isIsoDate(sp.from) ? sp.from : undefined;
  const to = isIsoDate(sp.to) ? sp.to : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const data = await listStockMovements({ q: sp.q, reason, from, to: to ?? from, page });

  return (
    <div className="p-6">
      <PageHeader title="Stock history" description="One shared stock for the shop and the website. Every change is listed here with who made it." actions={<AdjustStock />} />
      <div className="flex flex-wrap gap-3 mb-4">
        <SearchInput placeholder="Search product, barcode or note" />
        <SelectFilter param="reason" label="Reason" options={[{ value: "", label: "All changes" }, ...REASONS.map((r) => ({ value: r, label: STOCK_REASON_LABELS[r] }))]} />
        <form className="flex items-center gap-2 text-sm">
          {Object.entries(sp)
            .filter(([k, v]) => v && !["from", "to", "page"].includes(k))
            .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <input type="date" name="from" defaultValue={from} aria-label="From date" className="border border-gray-300 rounded-md px-2 py-2 bg-white" />
          <span className="text-gray-400">to</span>
          <input type="date" name="to" defaultValue={to} aria-label="To date" className="border border-gray-300 rounded-md px-2 py-2 bg-white" />
          <button className="rounded-md border border-gray-300 bg-white px-3 py-2">Apply</button>
        </form>
      </div>

      <TableWrap>
        <thead>
          <tr>
            <th className={th}>When</th>
            <th className={th}>Product</th>
            <th className={th}>Change</th>
            <th className={`${th} text-right`}>Qty</th>
            <th className={`${th} text-right`}>Stock after</th>
            <th className={th}>By / note</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.length === 0 && (
            <tr>
              <td colSpan={6} className={`${td} text-center text-gray-500 py-10`}>No stock changes match these filters.</td>
            </tr>
          )}
          {data.rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className={`${td} whitespace-nowrap text-xs text-gray-500`}>{formatDateTime(r.createdAt)}</td>
              <td className={td}>
                {r.productId ? <Link href={`/admin/products/${r.productId}`} className="hover:underline">{r.productName}</Link> : r.productName}
                <div className="text-xs text-gray-400">{r.variantName ? `Size ${r.variantName} · ` : ""}{r.barcode}</div>
              </td>
              <td className={td}>
                <Pill tone={tone[r.reason]}>{STOCK_REASON_LABELS[r.reason]}</Pill>
                {r.orderNumber && (
                  <div className="text-xs mt-0.5">
                    <Link href={`/admin/orders/${r.orderId}`} className="text-gray-500 hover:underline">{r.orderNumber}</Link>
                  </div>
                )}
              </td>
              <td className={`${td} text-right tabular-nums font-medium ${r.delta > 0 ? "text-green-700" : "text-red-700"}`}>{r.delta > 0 ? `+${r.delta}` : r.delta}</td>
              <td className={`${td} text-right tabular-nums`}>{r.stockAfter}</td>
              <td className={`${td} text-xs`}>
                {r.by ?? "—"}
                {r.note && <div className="text-gray-500">{r.note}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <div className="mt-4">
        <Pagination totalPages={data.totalPages} currentPage={data.page} />
      </div>
    </div>
  );
}
