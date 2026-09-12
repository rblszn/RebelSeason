"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrderStatus } from "@prisma/client";

export default function OrderStatusSelect({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: OrderStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [trackingUrl, setTrackingUrl] = useState("");

  const updateStatusAPI = async (newStatus: OrderStatus, trackUrl?: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, trackingUrl: trackUrl }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      
      setStatus(newStatus);
      router.refresh();
      setIsModalOpen(false);
      setTrackingUrl("");
    } catch (error) {
      console.error(error);
      alert("Error updating order status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as OrderStatus;
    if (newStatus === "SHIPPED") {
      setIsModalOpen(true);
    } else {
      updateStatusAPI(newStatus);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <label htmlFor="status" className="text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={handleStatusChange}
          disabled={isUpdating}
          className="block w-40 rounded-md border border-gray-300 py-1.5 pl-3 pr-10 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-50"
        >
          {Object.values(OrderStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {isUpdating && <span className="text-xs text-gray-500">Updating...</span>}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Enter Tracking Information</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="trackingUrl" className="block text-sm font-medium text-gray-700">
                  Tracking URL
                </label>
                <input
                  type="url"
                  id="trackingUrl"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://www.delhivery.com/track/..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setTrackingUrl("");
                  }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => updateStatusAPI("SHIPPED", trackingUrl)}
                  disabled={isUpdating || !trackingUrl.trim()}
                  className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-50"
                >
                  Update Status & Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
