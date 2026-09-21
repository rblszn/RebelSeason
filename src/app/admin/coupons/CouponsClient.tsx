"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  name: string;
  type: "PERCENTAGE" | "FLAT";
  value: number;
  maxLimit: number;
  appliesTo: "CART_VALUE" | "MRP";
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  _count: { redemptions: number };
}

const emptyForm = {
  code: "",
  name: "",
  type: "PERCENTAGE" as "PERCENTAGE" | "FLAT",
  value: "",
  maxLimit: "0",
  appliesTo: "CART_VALUE" as "CART_VALUE" | "MRP",
  expiresAt: "",
};

export default function CouponsClient() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchCoupons = async () => {
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (Array.isArray(data)) setCoupons(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const url = editingId ? `/api/admin/coupons/${editingId}` : "/api/admin/coupons";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchCoupons();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setForm({
      code: coupon.code,
      name: coupon.name,
      type: coupon.type,
      value: coupon.value.toString(),
      maxLimit: coupon.maxLimit.toString(),
      appliesTo: coupon.appliesTo,
      expiresAt: coupon.expiresAt ? coupon.expiresAt.split("T")[0] : "",
    });
    setEditingId(coupon.id);
    setShowForm(true);
    setError("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      fetchCoupons();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      fetchCoupons();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading coupons...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Coupons</h1>
          <p className="mt-1 text-sm text-gray-500">Manage discount coupons for your store</p>
        </div>
        <Button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); setError(""); }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> Add Coupon
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="border border-gray-200 rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">{editingId ? "Edit Coupon" : "New Coupon"}</h3>
          {error && <div className="text-red-500 text-sm mb-4 p-3 bg-red-50 rounded">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="REBEL20"
                required
                className="uppercase tracking-widest"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="20% Off Everything"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as "PERCENTAGE" | "FLAT" })}
                className="w-full h-10 border border-gray-200 rounded-md px-3 text-sm"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT">Flat Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value {form.type === "PERCENTAGE" ? "(%)" : "(₹)"}
              </label>
              <Input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder={form.type === "PERCENTAGE" ? "20" : "200"}
                required
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit <span className="text-gray-400">(0 = unlimited)</span></label>
              <Input
                type="number"
                value={form.maxLimit}
                onChange={(e) => setForm({ ...form, maxLimit: e.target.value })}
                placeholder="100"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Applies To</label>
              <select
                value={form.appliesTo}
                onChange={(e) => setForm({ ...form, appliesTo: e.target.value as "CART_VALUE" | "MRP" })}
                className="w-full h-10 border border-gray-200 rounded-md px-3 text-sm"
              >
                <option value="CART_VALUE">Cart Value (after product discounts)</option>
                <option value="MRP">MRP (original price)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date <span className="text-gray-400">(optional)</span></label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-3 sm:col-span-2">
              <Button type="submit" disabled={saving} className="px-6">
                {saving ? "Saving..." : editingId ? "Update Coupon" : "Create Coupon"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Coupons Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Discount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Used / Limit</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Applies To</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <Tag className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>No coupons yet. Click &quot;Add Coupon&quot; to create one.</p>
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">{coupon.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{coupon.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {coupon.type === "PERCENTAGE" ? `${coupon.value}%` : `₹${coupon.value}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {coupon._count.redemptions} / {coupon.maxLimit === 0 ? "∞" : coupon.maxLimit}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {coupon.appliesTo === "CART_VALUE" ? "Cart Value" : "MRP"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(coupon)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                        coupon.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {coupon.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {coupon.expiresAt
                      ? new Date(coupon.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(coupon)} className="text-gray-400 hover:text-gray-600 p-1">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(coupon.id)} className="text-gray-400 hover:text-red-500 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
