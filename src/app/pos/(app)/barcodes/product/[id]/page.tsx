import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requirePosPage } from "@/lib/pos-auth";
import { labelProduct } from "@/lib/pos/labels";
import { LabelOptionsBar } from "@/components/pos/label-options";
import { ProductLabels } from "./product-labels";

export const metadata = { title: "Barcodes" };

/** Barcodes, step 3: one product's sizes, each with its barcode and a label count. */
export default async function BarcodeProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePosPage("MANAGER");
  const { id } = await params;
  const product = await labelProduct(id);
  if (!product) notFound();
  return (
    <div className="space-y-4 max-w-3xl">
      <Link href={`/pos/barcodes/category/${product.category.id}`} className="inline-flex items-center text-sm text-gray-500 hover:text-foreground">
        <ChevronLeft className="w-4 h-4" /> {product.category.name}
      </Link>
      <div>
        <h1 className="font-heading text-2xl">{product.name}</h1>
        <p className="text-sm text-gray-500">{[product.category.parent?.name, product.category.name].filter(Boolean).join(" › ")}</p>
      </div>
      <LabelOptionsBar />
      <ProductLabels units={product.units} />
    </div>
  );
}
