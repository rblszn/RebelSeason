import { notFound } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";
import { getProductById } from "@/lib/dal/products";
import { getAllCategories } from "@/lib/dal/categories";
import { prisma } from "@/lib/db";
import { unitsOf, unitProductSelect } from "@/lib/pos/units";
import { ProductBarcodes } from "@/components/admin/ProductBarcodes";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const [product, categories] = await Promise.all([
    getProductById(id),
    getAllCategories(),
  ]);

  if (!product) {
    notFound();
  }

  // Barcodes: one per size (or the product itself), plus any supplier barcodes linked to them.
  const [unitProduct, supplierCodes] = await Promise.all([
    prisma.product.findUnique({ where: { id }, select: unitProductSelect }),
    prisma.supplierBarcode.findMany({ where: { OR: [{ productId: id }, { variant: { productId: id } }] }, select: { id: true, code: true, variantId: true } }),
  ]);
  const barcodeUnits = unitProduct
    ? unitsOf(unitProduct).map((u) => ({
        barcode: u.barcode,
        variantId: u.kind === "variant" ? u.id : null,
        size: u.size,
        price: u.price,
        stock: u.stock,
        supplierCodes: supplierCodes
          .filter((c) => (u.kind === "variant" ? c.variantId === u.id : c.variantId === null))
          .map((c) => ({ id: c.id, code: c.code })),
      }))
    : [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Edit Product</h1>
        <p className="text-gray-500 mt-1">Update product details for {product.name}.</p>
      </div>

      <ProductForm initialData={product} categories={categories.map(({ id, name, slug, type, parentId }) => ({ id, name, slug, type, parentId }))} />

      <div className="mt-8">
        <ProductBarcodes productId={product.id} units={barcodeUnits} />
      </div>
    </div>
  );
}
