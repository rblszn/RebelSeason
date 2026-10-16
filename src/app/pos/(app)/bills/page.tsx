import Link from "next/link";
import { Search } from "lucide-react";
import { atLeast, requirePosPage } from "@/lib/pos-auth";
import { addDays, istDate, isIsoDate } from "@/lib/ist";
import { listBills } from "@/lib/pos/bill";
import { formatPrice } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/lib/pos/types";

export const metadata = { title: "Bills" };

const time = (iso: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Today's shop bills (managers can look at other days). */
export default async function PosBillsPage({ searchParams }: { searchParams: Promise<{ date?: string; q?: string }> }) {
  const { staff } = await requirePosPage();
  const sp = await searchParams;
  const today = istDate();
  const manager = atLeast(staff.role, "MANAGER");
  const date = manager && isIsoDate(sp.date) && sp.date <= today ? sp.date : today;
  const bills = await listBills({ date, q: sp.q });
  const live = bills.filter((b) => b.status !== "CANCELLED");
  const total = live.reduce((s, b) => s + b.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">{date === today ? "Today's bills" : `Bills on ${new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "UTC" })}`}</h1>
          <p className="text-sm text-gray-500 tabular-nums">{live.length} bill{live.length === 1 ? "" : "s"} · {formatPrice(total)}</p>
        </div>
        {manager && (
          <div className="flex gap-2 text-sm">
            <Link href={`/pos/bills?date=${addDays(date, -1)}`} className="rounded-lg border border-gray-300 bg-white px-3 py-2">← Previous day</Link>
            {date !== today && <Link href="/pos/bills" className="rounded-lg border border-gray-300 bg-white px-3 py-2">Today</Link>}
          </div>
        )}
      </div>

      <form className="relative max-w-md">
        {date !== today && <input type="hidden" name="date" value={date} />}
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search bill no., phone or name" aria-label="Search bills" className="w-full h-11 border border-gray-300 rounded-lg pl-9 pr-3 text-base bg-white focus:outline-none focus:border-foreground" />
      </form>

      {bills.length === 0 ? (
        <p className="text-center text-gray-500 bg-white border border-gray-200 rounded-xl py-12">No bills {sp.q ? "match your search" : "yet"}.</p>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y">
          {bills.map((b) => (
            <li key={b.id}>
              <Link href={`/pos/bills/${b.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <span className="text-xs text-gray-500 tabular-nums w-12 shrink-0">{time(b.createdAt)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium tabular-nums truncate">{b.billNumber}</span>
                  <span className="block text-xs text-gray-500 truncate">
                    {b.customerName} · {b.customerPhone} · {b.itemCount} item{b.itemCount === 1 ? "" : "s"} · {b.methods.map((m) => PAYMENT_METHOD_LABELS[m]).join(" + ")}
                    {b.cashier ? ` · ${b.cashier}` : ""}
                  </span>
                </span>
                <span className={`text-right tabular-nums font-medium ${b.status === "CANCELLED" ? "line-through text-gray-400" : ""}`}>
                  {formatPrice(b.total)}
                  {b.status === "CANCELLED" && <span className="block text-xs text-red-600 no-underline">Cancelled</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
