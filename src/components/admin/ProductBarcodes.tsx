"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Plus, X } from "lucide-react";
import { BarcodeSvg } from "@/components/pos/barcode-svg";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";

type Unit = {
  barcode: string;
  /** Set for a size; null for a product without sizes. */
  variantId: string | null;
  size: string | null;
  price: number;
  stock: number;
  supplierCodes: { id: string; code: string }[];
};

/** Every barcode of a product (one per size), supplier barcodes that also scan, and label printing. */
export function ProductBarcodes({ productId, units }: { productId: string; units: Unit[] }) {
  const router = useRouter();
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const add = async (unit: Unit) => {
    const code = (drafts[unit.barcode] ?? "").trim();
    if (!code) return;
    setBusy(unit.barcode);
    try {
      await api(`/api/admin/products/${productId}/barcodes`, { body: { code, variantId: unit.variantId ?? undefined } });
      setDrafts((d) => ({ ...d, [unit.barcode]: "" }));
      toast("Barcode linked");
      router.refresh();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (barcodeId: string) => {
    try {
      await api(`/api/admin/products/${productId}/barcodes/${barcodeId}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  return (
    <div className="max-w-4xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3 border-b pb-2">
        <h2 className="text-xl font-semibold text-gray-800">Barcodes &amp; labels</h2>
        <a
          href={`/api/pos/labels?scope=product&id=${productId}&mode=stock`}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Download className="h-4 w-4" /> Labels for pieces in stock (PDF)
        </a>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Every size gets its own barcode automatically. Print the labels and attach one to each piece; the shop POS scans them to bill and count stock. If a supplier already
        barcodes the piece, link their code here and it scans too.
      </p>

      <ul className="divide-y">
        {units.map((u) => (
          <li key={u.barcode} className="flex flex-wrap items-start gap-x-6 gap-y-3 py-4">
            <div className="min-w-[8rem]">
              <p className="font-medium text-gray-900">{u.size ? `Size ${u.size}` : "Whole product"}</p>
              <p className="text-xs text-gray-500">
                {formatPrice(u.price)} · {u.stock} in stock
              </p>
            </div>
            <BarcodeSvg value={u.barcode} height={36} className="w-40" />
            <div className="min-w-[14rem] flex-1">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Supplier barcodes</p>
              <div className="flex flex-wrap gap-2">
                {u.supplierCodes.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 font-mono text-xs text-gray-700">
                    {c.code}
                    <button type="button" onClick={() => remove(c.id)} aria-label={`Remove ${c.code}`} className="text-gray-400 hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={drafts[u.barcode] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [u.barcode]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      add(u);
                    }
                  }}
                  placeholder="Scan or type a supplier barcode"
                  className="w-full max-w-xs rounded-md border border-gray-300 p-1.5 text-sm focus:border-black focus:ring-black"
                />
                <button
                  type="button"
                  onClick={() => add(u)}
                  disabled={busy === u.barcode || !(drafts[u.barcode] ?? "").trim()}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:border-black disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
