"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, X, Loader2, Trash2, Plus } from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import type { ProductWithRelations } from "@/lib/dal/products";
import {
  compareSizes,
  getSizePresetGroups,
  getTypeConfig,
  isProductType,
  normalizeAttribute,
  type AttributeKey,
  type ProductType,
} from "@/lib/catalog-config";

type Category = {
  id: string;
  name: string;
  slug: string;
  type: string;
  parentId: string | null;
};

type SizeRow = { size: string; stock: string };

type ProductFormProps = {
  initialData?: ProductWithRelations;
  categories: Category[];
};

const inputClass = "w-full p-2 border border-gray-300 rounded-md focus:ring-black focus:border-black";

export default function ProductForm({ initialData, categories }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const departments = categories.filter((c) => !c.parentId);
  const childrenOf = (departmentId: string) => categories.filter((c) => c.parentId === departmentId);

  const initialCategory = categories.find((c) => c.id === initialData?.categoryId);
  const [departmentId, setDepartmentId] = useState(
    initialCategory?.parentId ?? initialCategory?.id ?? departments[0]?.id ?? ""
  );
  const department = departments.find((d) => d.id === departmentId);
  const type: ProductType = department && isProductType(department.type) ? department.type : "CLOTHING";
  const config = getTypeConfig(type);
  // A department without categories under it can hold products itself.
  const categoryOptions = department
    ? childrenOf(department.id).length > 0
      ? childrenOf(department.id)
      : [department]
    : [];

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    slug: initialData?.slug || "",
    price: initialData?.price?.toString() || "",
    originalPrice: initialData?.originalPrice?.toString() || "",
    categoryId: initialData?.categoryId || "",
    description: initialData?.description || "",
    hasVariants: initialData?.hasVariants || false,
    stock: initialData?.stock?.toString() || "0",
    images: (initialData?.images || []) as string[],
  });

  const [attributes, setAttributes] = useState<Record<AttributeKey, string>>({
    color: initialData?.color || "",
    material: initialData?.material || "",
    shape: initialData?.shape || "",
    finish: initialData?.finish || "",
    dimensions: initialData?.dimensions || "",
  });

  const [sizes, setSizes] = useState<SizeRow[]>(
    Array.isArray(initialData?.variants)
      ? (initialData.variants as { size: string; stock: number }[])
          .map((v) => ({ size: v.size, stock: String(v.stock) }))
          .sort((a, b) => compareSizes(a.size, b.size))
      : []
  );
  const [customSize, setCustomSize] = useState("");

  // Required departments always have sizes; "none" departments never do.
  const usesSizes = config.size.mode === "required" || (config.size.mode === "optional" && formData.hasVariants);
  const selectedCategoryId = categoryOptions.some((c) => c.id === formData.categoryId)
    ? formData.categoryId
    : categoryOptions[0]?.id ?? "";

  const selectedCategory = categoryOptions.find((c) => c.id === selectedCategoryId);
  const sizePresetGroups = getSizePresetGroups(type, selectedCategory?.slug);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type: inputType } = e.target;
    if (inputType === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const addSize = (label: string) => {
    const size = label.trim();
    if (!size) return;
    setSizes((prev) =>
      prev.some((s) => s.size.toLowerCase() === size.toLowerCase())
        ? prev
        : [...prev, { size, stock: "0" }].sort((a, b) => compareSizes(a.size, b.size))
    );
  };

  const setSizeStock = (size: string, stock: string) => {
    setSizes((prev) => prev.map((s) => (s.size === size ? { ...s, stock } : s)));
  };

  const removeSize = (size: string) => {
    setSizes((prev) => prev.filter((s) => s.size !== size));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, "rebel-season/products");
      setFormData((prev) => ({ ...prev, images: [...prev.images, url] }));
    } catch (err) {
      console.error("Upload failed", err);
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      e.target.value = "";
      setUploading(false);
    }
  };

  // The first image is the cover shown on product cards and as the main photo.
  const makeCover = (index: number) => {
    setFormData((prev) => {
      const images = [...prev.images];
      const [picked] = images.splice(index, 1);
      return { ...prev, images: [picked, ...images] };
    });
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_: string, i: number) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedCategoryId) {
      setError("Please choose a category.");
      return;
    }
    for (const field of config.fields) {
      if (field.required && !normalizeAttribute(attributes[field.key])) {
        setError(`${field.label} is required for ${config.label.toLowerCase()} products.`);
        return;
      }
    }
    if (config.size.mode === "required" && sizes.length === 0) {
      setError(`Add at least one ${config.size.label.toLowerCase()} with its stock.`);
      return;
    }

    setLoading(true);

    // Only the fields this department uses are sent; the rest are cleared.
    const usedKeys = new Set(config.fields.map((f) => f.key));
    const attributePayload = Object.fromEntries(
      (Object.keys(attributes) as AttributeKey[]).map((key) => [key, usedKeys.has(key) ? attributes[key].trim() || null : null])
    );

    const variants = usesSizes ? sizes.map((s) => ({ size: s.size, stock: parseInt(s.stock) || 0 })) : [];
    const payload = {
      ...formData,
      categoryId: selectedCategoryId,
      ...attributePayload,
      price: parseInt(formData.price) || 0,
      originalPrice: formData.originalPrice ? parseInt(formData.originalPrice) : null,
      hasVariants: usesSizes,
      stock: usesSizes ? variants.reduce((sum, v) => sum + v.stock, 0) : parseInt(formData.stock) || 0,
      variants,
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

  const totalStock = sizes.reduce((sum, s) => sum + (parseInt(s.stock) || 0), 0);

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6 pb-20">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-md">{error}</div>}

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Basic Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setFormData((prev) => ({ ...prev, categoryId: "" }));
              }}
              className={inputClass}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="categoryId"
              required
              value={selectedCategoryId}
              onChange={handleChange}
              className={inputClass}
            >
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
                setFormData((prev) => ({ ...prev, name, slug }));
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input type="text" name="slug" required value={formData.slug} onChange={handleChange} className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">{config.label} Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {config.fields.map((field) => (
            <div key={field.key} className={field.key === "dimensions" ? "md:col-span-2" : ""}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                list={field.suggestions ? `suggest-${field.key}` : undefined}
                value={attributes[field.key]}
                onChange={(e) => setAttributes((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                maxLength={120}
                className={inputClass}
              />
              {field.suggestions && (
                <datalist id={`suggest-${field.key}`}>
                  {field.suggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              )}
            </div>
          ))}
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
              className={inputClass}
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
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">
          {config.size.mode === "none" ? "Inventory" : `Inventory & ${config.size.label}`}
        </h2>

        {config.size.mode === "optional" && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasVariants"
              name="hasVariants"
              checked={formData.hasVariants}
              onChange={handleChange}
              className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
            />
            <label htmlFor="hasVariants" className="text-sm font-medium text-gray-700">
              This product comes in different {config.size.label.toLowerCase()}s
            </label>
          </div>
        )}
        {config.size.hint && <p className="text-sm text-gray-500">{config.size.hint}</p>}

        {usesSizes ? (
          <div className="space-y-4">
            <div className="space-y-2">
              {sizePresetGroups.map((group) => (
                <div key={group.label} className="flex flex-wrap items-center gap-2">
                  <span className="w-40 text-xs font-medium uppercase tracking-wide text-gray-500">{group.label}</span>
                  {group.values.map((value) => {
                    const added = sizes.some((s) => s.size.toLowerCase() === value.toLowerCase());
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => addSize(value)}
                        disabled={added}
                        className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                          added
                            ? "border-black bg-black text-white opacity-60"
                            : "border-gray-300 text-gray-700 hover:border-black"
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <span className="w-40 text-xs font-medium uppercase tracking-wide text-gray-500">Custom</span>
                <input
                  type="text"
                  value={customSize}
                  maxLength={20}
                  onChange={(e) => setCustomSize(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSize(customSize);
                      setCustomSize("");
                    }
                  }}
                  placeholder={`e.g. ${type === "NAIL_EXTENSIONS" ? "12 mm" : type === "JEWELLERY" ? '17"' : "42"}`}
                  className="w-40 rounded-md border border-gray-300 p-1.5 text-sm focus:border-black focus:ring-black"
                />
                <button
                  type="button"
                  onClick={() => {
                    addSize(customSize);
                    setCustomSize("");
                  }}
                  className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:border-black"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            {sizes.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {sizes.map((row) => (
                  <div key={row.size} className="rounded-md border border-gray-200 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{row.size}</span>
                      <button
                        type="button"
                        onClick={() => removeSize(row.size)}
                        aria-label={`Remove ${row.size}`}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <label className="block text-xs text-gray-500 mb-1">Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={row.stock}
                      onChange={(e) => setSizeStock(row.size, e.target.value)}
                      className="w-full rounded-md border border-gray-300 p-1.5 focus:border-black focus:ring-black"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-amber-600">No {config.size.label.toLowerCase()}s added yet.</p>
            )}
            <p className="text-xs text-gray-500">Total stock: {totalStock}</p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Stock</label>
            <input
              type="number"
              name="stock"
              min="0"
              required
              value={formData.stock}
              onChange={handleChange}
              className={`${inputClass} max-w-xs`}
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
                aria-label="Remove image"
                className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-600 shadow-sm hover:bg-white"
              >
                <X size={16} />
              </button>
              {i === 0 ? (
                <span className="absolute bottom-2 left-2 rounded bg-black/80 px-2 py-0.5 text-[11px] font-medium text-white">
                  Cover
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCover(i)}
                  className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[11px] font-medium text-gray-800 shadow-sm hover:bg-white"
                >
                  Set as cover
                </button>
              )}
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
        ) : (
          <div></div>
        )}

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
