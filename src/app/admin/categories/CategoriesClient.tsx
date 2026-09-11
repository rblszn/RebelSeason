"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Upload, Loader2 } from "lucide-react";
import { CategoryWithRelations } from "@/lib/dal/categories";
import { useRouter } from "next/navigation";

export default function CategoriesClient({
  initialCategories,
}: {
  initialCategories: CategoryWithRelations[];
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithRelations | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
  });

  const openModal = (category: CategoryWithRelations | null = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        image: category.image || "",
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: "", slug: "", description: "", image: "" });
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
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (data.url) {
        setFormData(prev => ({ ...prev, image: data.url }));
      }
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const url = editingCategory 
        ? `/api/admin/categories/${editingCategory.id}` 
        : "/api/admin/categories";
        
      const res = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save category");

      const savedCategory = await res.json();
      
      if (editingCategory) {
        setCategories(categories.map(c => c.id === savedCategory.id ? { ...c, ...savedCategory } : c));
      } else {
        setCategories([...categories, { ...savedCategory, _count: { products: 0 } }]);
      }
      
      closeModal();
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error saving category");
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
      
      setCategories(categories.filter(c => c.id !== id));
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Categories</h1>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          Add Category
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
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{category.name}</div>
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
                    <button
                      onClick={() => openModal(category)}
                      className="text-gray-600 hover:text-black mr-4"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={category._count.products > 0}
                      title={category._count.products > 0 ? "Cannot delete category with products" : "Delete category"}
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
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">
              {editingCategory ? "Edit Category" : "Add Category"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    setFormData({ ...formData, name, slug });
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Slug</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
                            <div>
                <label className="block text-sm font-medium text-gray-700">Category Image</label>
                <div className="mt-1 flex items-center gap-4">
                  {formData.image ? (
                    <div className="relative w-16 h-16 rounded-md overflow-hidden border border-gray-200">
                      <img src={formData.image} alt="Preview" className="object-cover w-full h-full" />
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, image: ''})} 
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

