"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api-client";
import { cn, formatPrice } from "@/lib/utils";
import { ScanBar, Thumb } from "@/components/pos/scan-bar";
import { useCatalog } from "@/components/pos/use-catalog";

type Lookup = {
  scannedBarcode: string;
  product: { id: string; name: string; category: string; onWebsite: boolean; imageUrl: string | null };
  units: { barcode: string; size: string | null; price: number; mrp: number; stock: number; onWebsite: boolean }[];
};

/** Scan any tag to see every size of that product, live stock, and whether it's on the website. */
export function StockCheck() {
  const toast = useToast();
  const catalog = useCatalog();
  const [result, setResult] = useState<Lookup | null>(null);
  const [busy, setBusy] = useState(false);

  const check = async (code: string) => {
    setBusy(true);
    try {
      setResult(await api<Lookup>(`/api/pos/stock?code=${encodeURIComponent(code)}`));
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h1 className="font-heading text-2xl">Stock check</h1>
      <ScanBar lookup={catalog.lookup} search={catalog.search} onPick={(v) => check(v.barcode)} onUnknown={check} placeholder="Scan a tag or type a product name" />
      {busy && <p className="text-sm text-gray-500">Checking…</p>}
      {result && (
        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex gap-3 p-4 border-b border-gray-100">
            <Thumb src={result.product.imageUrl} alt={result.product.name} size={64} />
            <div className="min-w-0">
              <p className="font-medium text-lg leading-snug">{result.product.name}</p>
              <p className="text-xs text-gray-500">{result.product.category}</p>
              <p className={cn("text-xs mt-1 inline-flex items-center gap-1", result.product.onWebsite ? "text-green-700" : "text-gray-500")}>
                <Globe className="w-3.5 h-3.5" /> {result.product.onWebsite ? "Live on the website" : "Not on the website yet (scheduled)"}
              </p>
            </div>
          </div>
          <ul className="divide-y">
            {result.units.map((v) => (
              <li key={v.barcode} className={cn("flex items-center gap-3 px-4 py-3", v.barcode === result.scannedBarcode && "bg-primary/10")}>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium">{v.size ? `Size ${v.size}` : "Whole product"}</span>
                  <span className="block text-xs text-gray-500 font-mono">{v.barcode}{v.barcode === result.scannedBarcode ? " · scanned" : ""}</span>
                </span>
                <span className="text-sm tabular-nums text-gray-600">{formatPrice(v.price)}</span>
                <span className={cn("w-24 text-right font-semibold tabular-nums", v.stock <= 0 ? "text-red-600" : v.stock <= 2 ? "text-amber-700" : "text-green-700")}>
                  {v.stock <= 0 ? "Sold out" : `${v.stock} left`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
