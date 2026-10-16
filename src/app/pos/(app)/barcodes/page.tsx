import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requirePosPage } from "@/lib/pos-auth";
import { labelDepartments } from "@/lib/pos/labels";
import { LabelDownloadButton, LabelOptionsBar } from "@/components/pos/label-options";

export const metadata = { title: "Barcodes" };

/** Barcodes, step 1: departments. Download labels for a whole department, or open it. */
export default async function BarcodesPage() {
  await requirePosPage("MANAGER");
  const departments = await labelDepartments();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl">Barcodes &amp; labels</h1>
        <p className="text-sm text-gray-500">Every size has its own barcode. Download a sheet, print it, cut and attach the labels.</p>
      </div>
      <LabelOptionsBar />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {departments.map((d) => (
          <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
            <Link href={`/pos/barcodes/category/${d.id}`} className="flex items-start justify-between gap-2 group">
              <div>
                <p className="font-medium text-lg group-hover:text-foreground/70">{d.name}</p>
                <p className="text-xs text-gray-500">
                  {d.products} product{d.products === 1 ? "" : "s"} · {d.units} label type{d.units === 1 ? "" : "s"} · {d.pieces} in stock
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 mt-1" />
            </Link>
            <div className="flex gap-2 mt-auto">
              <LabelDownloadButton scope="department" id={d.id} pieces={d.pieces} units={d.units} className="flex-1" />
              <Link href={`/pos/barcodes/category/${d.id}`} className="rounded-lg border border-gray-300 px-3 h-10 leading-10 text-sm">Open</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
