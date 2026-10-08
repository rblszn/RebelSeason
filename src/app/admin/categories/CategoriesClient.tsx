"use client";

import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { useState } from "react";
import { Plus, Edit2, Trash2, Upload, Loader2 } from "lucide-react";
import { CategoryWithRelations } from "@/lib/dal/categories";
import { useRouter } from "next/navigation";
import { PRODUCT_TYPES, PRODUCT_TYPE_CONFIG, type ProductType } from "@/lib/catalog-config";

type FormState = {
  name: string;
  slug: string;
  description: string;
  image: string;
  parentId: string;
  type: ProductType;
  sortOrder: string;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  image: "",
  parentId: "",
  type: "CLOTHING",
  sortOrder: "100",
};

const inputClass =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black";

/** Departments first, each followed by its categories. */
function orderAsTree(categories: CategoryWithRelations[]) {
  const roots = categories.filter((c) => !c.parentId);
  const rows: { category: CategoryWithRelations; depth: number }[] = [];
  for (const root of roots) {
    rows.push({ category: root, depth: 0 });
    for (const child of categories.filter((c) => c.parentId === root.id)) {
      rows.push({ category: child, depth: 1 });
    }
  }
  return rows;
}

export default function CategoriesClient({
  initialCategories,
}: {
  initialCategories: CategoryWithRelations[];
}) {
  const router = useRouter();
  // The page is server-rendered on every request, so the list always comes from props.
  const categories = initialCategories;
  const departments = categories.filter((c) => !c.parentId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithRelations | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);

  const openModal = (category: CategoryWithRelations | null = null, parentId = "") => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        image: category.image || "",
        parentId: category.parentId || "",
        type: category.type as ProductType,
        sortOrder: String(category.sortOrder),
      });
    } else {
      setEditingCategory(null);
      const parent = departments.find((d) => d.id === parentId);
      setFormData({
        ...emptyForm,
        parentId,
        type: (parent?.type as ProductType) ?? emptyForm.type,
        sortOrder: parentId ? "100" : String((departments.length + 1) * 10),
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, "rebel-season/categories");
      setFormData((prev) => ({ ...prev, image: url }));
    } catch (err) {
      console.error("Upload failed", err);
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingCategory ? `/api/admin/categories/${editingCategory.id}` : "/api/admin/categories";

      const res = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          image: formData.image,
          parentId: formData.parentId || null,
          type: formData.type,
          sortOrder: parseInt(formData.sortOrder) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save category");
      }

      closeModal();
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Error saving category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete category");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete category");
    }
  };

  // A department that already has categories cannot itself be moved under another department.
  const canChooseParent = !editingCategory || editingCategory._count.children === 0;
  const parentOptions = departments.filter((d) => d.id !== editingCategory?.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-500">
            Departments (Clothing, Bags, Jewellery, Nail Extensions) group the categories shoppers browse.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          Add Department / Category
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {orderAsTree(categories).map(({ category, depth }) => (
                <tr key={category.id} className={depth === 0 ? "bg-gray-50/60" : ""}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className={`flex items-center gap-2 text-sm ${depth === 0 ? "font-semibold text-gray-900" : "pl-6 text-gray-800"}`}>
                      {category.name}
                      {depth === 0 && (
                        <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                          {PRODUCT_TYPE_CONFIG[category.type as ProductType]?.label ?? category.type}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-500">{category.slug}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-500">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {category._count.products} products
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    {depth === 0 && (
                      <button
                        onClick={() => openModal(null, category.id)}
                        className="mr-4 text-xs font-medium text-gray-600 hover:text-black"
                      >
                        + Add category
                      </button>
                    )}
                    <button onClick={() => openModal(category)} className="text-gray-600 hover:text-black mr-4" aria-label="Edit">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={category._count.products > 0 || category._count.children > 0}
                      title={
                        category._count.children > 0
                          ? "Cannot delete a department that has categories"
                          : category._count.products > 0
                            ? "Cannot delete category with products"
                            : "Delete"
                      }
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">
              {editingCategory ? "Edit" : "Add"} {formData.parentId ? "Category" : "Department"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Belongs to</label>
                <select
                  value={formData.parentId}
                  disabled={!canChooseParent}
                  onChange={(e) => {
                    const parent = departments.find((d) => d.id === e.target.value);
                    setFormData({ ...formData, parentId: e.target.value, type: (parent?.type as ProductType) ?? formData.type });
                  }}
                  className={inputClass}
                >
                  <option value="">Nothing: this is a top-level department</option>
                  {parentOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {!formData.parentId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ProductType })}
                    className={inputClass}
                  >
                    {PRODUCT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {PRODUCT_TYPE_CONFIG[t].label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Decides which details products need:{" "}
                    {[
                      ...PRODUCT_TYPE_CONFIG[formData.type].fields.map((f) => f.label),
                      ...(PRODUCT_TYPE_CONFIG[formData.type].size.mode === "none" ? [] : [PRODUCT_TYPE_CONFIG[formData.type].size.label]),
                    ].join(", ")}
                    .
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
                    setFormData({ ...formData, name, slug });
                  }}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Slug</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Display order</label>
                <input
                  type="number"
                  min="0"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-500">Lower numbers come first in menus and on the homepage.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Image</label>
                <div className="mt-1 flex items-center gap-4">
                  {formData.image ? (
                    <div className="relative w-16 h-16 rounded-md overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={formData.image} alt="Preview" className="object-cover w-full h-full" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: "" })}
                        className="absolute top-0 right-0 bg-white/80 p-0.5"
                      >
                        <Trash2 size={12} className="text-red-500" />
                      </button>
                    </div>
                  ) : null}
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-4 hover:bg-gray-50 cursor-pointer transition-colors w-full">
                    {uploading ? (
                      <Loader2 className="animate-spin text-gray-400" size={20} />
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="text-gray-400 mb-1" size={20} />
                        <span className="text-xs text-gray-500">Upload Photo</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
