import ProductForm from "@/components/admin/ProductForm";
import { getAllCategories } from "@/lib/dal/categories";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await getAllCategories();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Add New Product</h1>
        <p className="text-gray-500 mt-1">Create a new product in your store.</p>
      </div>

      <ProductForm categories={categories.map(c => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
