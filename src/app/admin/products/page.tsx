import Link from "next/link";
import { Plus } from "lucide-react";
import { getAllProducts } from "@/lib/dal/products";
import Image from "next/image";
import { ProductActions } from "./ProductActions";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await getAllProducts();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        <Link
          href="/admin/products/new"
          className="bg-black text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <Plus size={20} />
          Create Product
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
              <th className="p-4 font-medium">Image</th>
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Category</th>
              <th className="p-4 font-medium">Price</th>
              <th className="p-4 font-medium">Stock</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-4">
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        width={48}
                        height={48}
                        className="w-12 h-12 object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center text-gray-400 text-xs">
                        No Img
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-medium text-gray-800">{product.name}</td>
                  <td className="p-4 text-gray-600">{product.category.name}</td>
                  <td className="p-4 text-gray-600">
                    ₹{product.price.toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 text-gray-600">
                    {product.hasVariants 
                      ? `${product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0} (Variants)`
                      : product.stock
                    }
                  </td>
                  <td className="p-4">
                    <ProductActions productId={product.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
