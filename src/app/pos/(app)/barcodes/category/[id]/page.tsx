import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requirePosPage } from "@/lib/pos-auth";
import { labelCategory } from "@/lib/pos/labels";
import { LabelDownloadButton, LabelOptionsBar } from "@/components/pos/label-options";
import { Thumb } from "@/components/pos/thumb";
import { cn } from "@/lib/utils";

export const metadata = { title: "Barcodes" };

/** Barcodes, step 2: one department (or category) with its categories and products. ?sub=<id> filters the list. */
export default async function BarcodeCategoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sub?: string }> }) {
  await requirePosPage("MANAGER");
  const [{ id }, { sub }] = await Promise.all([params, searchParams]);
  const category = await labelCategory(id);
  if (!category) notFound();
  const activeSub = category.categories.find((c) => c.id === sub) ?? null;
  const products = activeSub ? category.products.filter((p) => p.categoryId === activeSub.id) : category.products;
  const isDepartment = !category.parent;

  return (
    <div className="space-y-4">
      <Link href={category.parent ? `/pos/barcodes/category/${category.parent.id}` : "/pos/barcodes"} className="inline-flex items-center text-sm text-gray-500 hover:text-foreground">
        <ChevronLeft className="w-4 h-4" /> {category.parent ? category.parent.name : "All departments"}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-heading text-2xl">{category.name}</h1>
        <LabelDownloadButton
          scope={isDepartment ? "department" : "category"}
          id={category.id}
          pieces={category.products.reduce((s, p) => s + p.pieces, 0)}
          units={category.products.reduce((s, p) => s + p.units, 0)}
        />
      </div>
      <LabelOptionsBar />

      {category.categories.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Categories</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Link href={`/pos/barcodes/category/${category.id}`} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm", !activeSub ? "border-foreground bg-foreground text-white" : "border-gray-300 bg-white")}>
              All
            </Link>
            {category.categories.map((c) => (
              <Link key={c.id} href={`/pos/barcodes/category/${category.id}?sub=${c.id}`} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm whitespace-nowrap", activeSub?.id === c.id ? "border-foreground bg-foreground text-white" : "border-gray-300 bg-white")}>
                {c.name} <span className="opacity-70">({c.products})</span>
              </Link>
            ))}
          </div>
          {activeSub && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-sm"><b>{activeSub.name}</b> · {activeSub.products} products · {activeSub.pieces} in stock</p>
              <LabelDownloadButton scope="category" id={activeSub.id} pieces={activeSub.pieces} units={activeSub.units} />
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Products</h2>
        {products.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-xl p-6 text-center">No products here yet. Add them in Admin → Products; barcodes are created automatically.</p>
        ) : (
          <ul className="bg-white border border-gray-200 rounded-xl divide-y">
            {products.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-3">
                <Link href={`/pos/barcodes/product/${p.id}`} className="flex flex-1 min-w-0 items-center gap-3 group">
                  <Thumb src={p.imageUrl} alt={p.name} size={44} />
                  <span className="min-w-0">
                    <span className="block font-medium truncate group-hover:text-foreground/70">{p.name}</span>
                    <span className="block text-xs text-gray-500">{p.units} label type{p.units === 1 ? "" : "s"} · {p.pieces} in stock</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto shrink-0" />
                </Link>
                <LabelDownloadButton scope="product" id={p.id} pieces={p.pieces} units={p.units} compact />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
