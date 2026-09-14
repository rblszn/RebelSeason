import { getAllOrders, getOrdersCount } from "@/lib/dal/orders";
import { Pagination } from "@/components/ui/Pagination";
import Link from "next/link";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Orders | Admin",
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || "1", 10);
  const limit = 10;
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    getAllOrders({ skip, limit }),
    getOrdersCount()
  ]);
  const totalPages = Math.ceil(total / limit);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-50 text-yellow-700 ring-yellow-600/20";
      case "PROCESSING":
        return "bg-blue-50 text-blue-700 ring-blue-700/10";
      case "SHIPPED":
        return "bg-indigo-50 text-indigo-700 ring-indigo-700/10";
      case "DELIVERED":
        return "bg-green-50 text-green-700 ring-green-600/20";
      case "CANCELLED":
        return "bg-red-50 text-red-700 ring-red-600/10";
      default:
        return "bg-gray-50 text-gray-600 ring-gray-500/10";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Orders</h1>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {format(new Date(order.createdAt), "MMM d, yyyy")}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900">{order.customerName}</div>
                    <div className="text-sm text-gray-500">{order.customerEmail}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      ₹{(order.total / 100).toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-black hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">
              No orders found.
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200">
            <Pagination totalPages={totalPages} currentPage={page} />
          </div>
        )}
      </div>
    </div>
  );
}


