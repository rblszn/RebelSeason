import { notFound } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";
import { getProductById } from "@/lib/dal/products";
import { getAllCategories } from "@/lib/dal/categories";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const [product, categories] = await Promise.all([
    getProductById(id),
    getAllCategories(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Edit Product</h1>
        <p className="text-gray-500 mt-1">Update product details for {product.name}.</p>
      </div>

      <ProductForm initialData={product} categories={categories.map(c => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
