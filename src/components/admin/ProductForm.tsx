"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, X, Loader2, Trash2 } from "lucide-react";

type Category = {
  id: string;
  name: string;
};

type ProductFormProps = {
  initialData?: any;
  categories: Category[];
};

const SIZES = ["S", "M", "L", "XL", "XXL"];

export default function ProductForm({ initialData, categories }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    slug: initialData?.slug || "",
    price: initialData?.price?.toString() || "",
    originalPrice: initialData?.originalPrice?.toString() || "",
    categoryId: initialData?.categoryId || (categories[0]?.id || ""),
    description: initialData?.description || "",
    hasVariants: initialData?.hasVariants || false,
    stock: initialData?.stock?.toString() || "0",
    images: initialData?.images || [],
  });

  const initialVariantMap: Record<string, string> = {};
  if (initialData?.variants && Array.isArray(initialData.variants)) {
    initialData.variants.forEach((v: Record<string, unknown>) => {
      if (typeof v.size === 'string' && v.stock !== undefined) {
        initialVariantMap[v.size] = String(v.stock);
      }
    });
  }
  
  const [variants, setVariants] = useState<Record<string, string>>(
    SIZES.reduce((acc, size) => ({ ...acc, [size]: initialVariantMap[size] || "0" }), {})
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleVariantChange = (size: string, value: string) => {
    setVariants((prev) => ({ ...prev, [size]: value }));
  };

  const generateSlug = () => {
    if (!formData.name) return;
    const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setFormData(prev => ({ ...prev, slug }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (data.url) {
        setFormData(prev => ({ ...prev, images: [...prev.images, data.url] }));
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_: string, i: number) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      ...formData,
      price: parseInt(formData.price) || 0,
      originalPrice: formData.originalPrice ? parseInt(formData.originalPrice) : null,
      stock: formData.hasVariants ? 
             Object.values(variants).reduce((sum, val) => sum + (parseInt(val) || 0), 0) : 
             (parseInt(formData.stock) || 0),
      variants: formData.hasVariants ? SIZES.map(size => ({
        size,
        stock: parseInt(variants[size]) || 0
      })) : []
    };

    try {
      const url = initialData ? `/api/admin/products/${initialData.id}` : "/api/admin/products";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save product");
      }

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData || !confirm("Are you sure you want to delete this product?")) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/products/${initialData.id}`, { method: "DELETE" });
      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Failed to delete product");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6 pb-20">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-md">{error}</div>}
      
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Basic Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                setFormData(prev => ({ ...prev, name, slug }));
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              type="text"
              name="slug"
              required
              value={formData.slug}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="categoryId"
              required
              value={formData.categoryId}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
            >
              <option value="" disabled>Select category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
            <input
              type="number"
              name="price"
              required
              min="0"
              value={formData.price}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Original Price (₹)</label>
            <input
              type="number"
              name="originalPrice"
              min="0"
              value={formData.originalPrice}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Inventory</h2>
        
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="hasVariants"
            name="hasVariants"
            checked={formData.hasVariants}
            onChange={handleChange}
            className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
          />
          <label htmlFor="hasVariants" className="text-sm font-medium text-gray-700">
            This product has sizes (S, M, L, XL, XXL)
          </label>
        </div>

        {formData.hasVariants ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-2">Set stock for each size:</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {SIZES.map(size => (
                <div key={size}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size {size}</label>
                  <input
                    type="number"
                    min="0"
                    value={variants[size]}
                    onChange={(e) => handleVariantChange(size, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Total Stock: {Object.values(variants).reduce((sum, val) => sum + (parseInt(val) || 0), 0)}
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Stock</label>
            <input
              type="number"
              name="stock"
              min="0"
              required={!formData.hasVariants}
              value={formData.stock}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black max-w-xs"
            />
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Images</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {formData.images.map((url: string, i: number) => (
            <div key={i} className="relative aspect-[3/4] bg-gray-100 rounded-md overflow-hidden border border-gray-200">
              <Image src={url} alt={`Product ${i}`} fill className="object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-2 right-2 bg-white/80 p-1 rounded-full text-red-600 hover:bg-white"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <label className="relative aspect-[3/4] bg-gray-50 rounded-md border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
            {uploading ? (
              <Loader2 className="animate-spin text-gray-400" size={24} />
            ) : (
              <>
                <Upload className="text-gray-400 mb-2" size={24} />
                <span className="text-sm text-gray-500">Upload Image</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 pt-6">
        {initialData ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-md transition-colors font-medium flex items-center gap-2"
          >
            <Trash2 size={18} /> Delete Product
          </button>
        ) : <div></div>}
        
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {initialData ? "Update Product" : "Create Product"}
          </button>
        </div>
      </div>
    </form>
  );
}
