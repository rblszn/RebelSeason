import Link from "next/link";
import { OrderWithRelations } from "@/lib/dal/orders";
import { ArrowRight, ShoppingBag } from "lucide-react";

interface RecentOrdersWidgetProps {
  orders: OrderWithRelations[];
}

function getStatusBadge(status: string) {
  switch (status) {
    case "DELIVERED":
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Delivered
        </span>
      );
    case "SHIPPED":
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          Shipped
        </span>
      );
    case "PROCESSING":
      return (
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
          Processing
        </span>
      );
    case "CONFIRMED":
      return (
        <span className="inline-flex items-center rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700">
          Confirmed
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
          Cancelled
        </span>
      );
    case "PENDING":
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          Pending
        </span>
      );
  }
}

export function RecentOrdersWidget({ orders }: RecentOrdersWidgetProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs font-sans">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Latest customer purchases across the storefront
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900 hover:underline"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-3">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-gray-900">No orders placed yet</p>
          <p className="text-xs text-gray-500 mt-1 max-w-xs">
            As soon as customers place orders on the storefront, they will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th scope="col" className="pb-3 pr-4">
                  Order Number
                </th>
                <th scope="col" className="pb-3 pr-4">
                  Customer
                </th>
                <th scope="col" className="pb-3 pr-4">
                  Status
                </th>
                <th scope="col" className="pb-3 pr-4">
                  Items
                </th>
                <th scope="col" className="pb-3 pr-4">
                  Date
                </th>
                <th scope="col" className="pb-3 text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => {
                const formattedDate = new Date(order.date).toLocaleDateString(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }
                );

                return (
                  <tr key={order.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 pr-4 font-mono text-xs font-medium text-gray-900">
                      {order.orderNumber}
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="font-medium text-gray-900 text-xs">
                        {order.customerName}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {order.customerEmail || order.customerPhone}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">{getStatusBadge(order.status)}</td>
                    <td className="py-3.5 pr-4 text-xs text-gray-600">
                      {order.items.length} {order.items.length === 1 ? "item" : "items"}
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-gray-500">
                      {formattedDate}
                    </td>
                    <td className="py-3.5 text-right font-medium text-gray-900 text-xs">
                      ₹{order.total.toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
