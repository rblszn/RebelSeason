import { getOrderById } from "@/lib/dal/orders";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import OrderStatusSelect from "./OrderStatusSelect";

export const metadata = {
  title: "Order Details | Admin",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  const address = typeof order.shippingAddress === 'string' 
    ? JSON.parse(order.shippingAddress) 
    : order.shippingAddress as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders" className="text-gray-500 hover:text-black">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Order #{order.orderNumber}
          </h1>
        </div>
        <OrderStatusSelect orderId={order.id} initialStatus={order.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                    <img
                      src={item.image || "/placeholder.jpg"}
                      alt={item.name}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between text-sm font-medium text-gray-900">
                      <h3>{item.name}</h3>
                      <p className="ml-4">₹{item.price.toLocaleString('en-IN')}</p>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {item.variantName ? `Size: ${item.variantName}` : "One Size"}
                    </p>
                    <div className="flex flex-1 items-end justify-between text-sm">
                      <p className="text-gray-500">Qty {item.quantity}</p>
                      <p className="font-medium text-gray-900">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between text-sm font-medium text-gray-900">
                <p>Total</p>
                <p>₹{order.total.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Customer Info</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Name</p>
                <p className="font-medium text-gray-900">{order.customerName}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{order.customerEmail}</p>
              </div>
              <div>
                <p className="text-gray-500">Date</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(order.createdAt), "MMMM d, yyyy h:mm a")}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Shipping Address</h2>
            {address ? (
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium text-gray-900">{address.name}</p>
                <p>{address.street}</p>
                <p>{address.city}, {address.state} {address.pincode}</p>
                <p>Phone: {address.phone}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No shipping address available</p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Tracking Information</h2>
            {(order as any).trackingUrl ? (
              <a 
                href={(order as any).trackingUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {(order as any).trackingUrl}
              </a>
            ) : (
              <p className="text-sm text-gray-500">No tracking information available</p>
            )}
          </div>
          
          {order.payment && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Status</p>
                  <span className={`mt-1 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                    order.payment.status === 'CAPTURED' ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                    order.payment.status === 'UNPAID' ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' : 
                    'bg-red-50 text-red-700 ring-red-600/10'
                  }`}>
                    {order.payment.status}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500">Method</p>
                  <p className="font-medium text-gray-900 capitalize">{order.payment.method.toLowerCase()}</p>
                </div>
                {order.payment.razorpayPaymentId && (
                  <div>
                    <p className="text-gray-500">Transaction ID</p>
                    <p className="font-medium text-gray-900">{order.payment.razorpayPaymentId}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



