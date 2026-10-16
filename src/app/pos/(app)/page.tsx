import Link from "next/link";
import { Barcode, ClipboardList, PackagePlus, ReceiptText, ScanSearch, Store, Wallet } from "lucide-react";
import { requirePosPage, atLeast } from "@/lib/pos-auth";
import { getOpenRegister, registerSummary } from "@/lib/pos/register";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Home" };

/** POS home: big tiles for each job, plus today's running totals. */
export default async function PosHomePage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const [{ staff }, { denied }] = await Promise.all([requirePosPage(), searchParams]);
  const open = await getOpenRegister();
  const today = open ? await registerSummary(open.id) : null;
  const manager = atLeast(staff.role, "MANAGER");

  const tiles = [
    { href: "/pos/bill", label: "New bill", hint: "Scan tags & take payment", icon: ReceiptText, primary: true },
    { href: "/pos/bills", label: "Today's bills", hint: "Reprint, email or cancel", icon: ClipboardList },
    { href: "/pos/stock", label: "Stock check", hint: "Scan to see sizes in stock", icon: ScanSearch },
    ...(manager
      ? [
          { href: "/pos/receive", label: "Receive stock", hint: "Add new pieces + labels", icon: PackagePlus },
          { href: "/pos/barcodes", label: "Barcodes", hint: "Download price-tag labels", icon: Barcode },
        ]
      : []),
    { href: "/pos/register", label: open ? "Close the day" : "Open the day", hint: open ? "Count the cash drawer" : "Enter opening cash", icon: Wallet },
  ];

  return (
    <div className="space-y-5">
      {denied && <p role="alert" className="rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-900">That screen is for managers and the owner.</p>}
      <section className={`rounded-xl p-4 border ${open ? "bg-white border-gray-200" : "bg-amber-50 border-amber-300"}`}>
        {today ? (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Today&apos;s sales</p>
              <p className="text-2xl font-semibold tabular-nums">{formatPrice(today.sales)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Bills</p>
              <p className="text-2xl font-semibold tabular-nums">{today.billCount}</p>
            </div>
            <div className="text-sm text-gray-600 tabular-nums">
              Cash {formatPrice(today.cash)} · UPI {formatPrice(today.upi)} · Card {formatPrice(today.card)}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Store className="w-6 h-6 text-amber-700" />
              <p className="text-sm text-amber-900">The day isn&apos;t open yet. Enter the opening cash to start billing.</p>
            </div>
            <Link href="/pos/register" className="rounded-lg bg-foreground text-white px-4 py-2.5 text-sm font-medium">Open the day</Link>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map(({ href, label, hint, icon: Icon, primary }) => (
          <Link
            key={href}
            href={href}
            className={`rounded-xl p-4 sm:p-5 min-h-28 flex flex-col justify-between border transition-colors ${
              primary ? "bg-foreground text-white border-foreground col-span-2 lg:col-span-1 hover:bg-foreground/90" : "bg-white border-gray-200 hover:border-foreground"
            }`}
          >
            <Icon className={`w-7 h-7 ${primary ? "text-primary" : "text-foreground"}`} />
            <div className="mt-3">
              <p className="font-medium text-lg leading-tight">{label}</p>
              <p className={`text-xs mt-0.5 ${primary ? "text-white/75" : "text-gray-500"}`}>{hint}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
