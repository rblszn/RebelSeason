import { getOrderById } from "@/lib/dal/orders";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { buildBill } from "@/lib/bill";
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

  const bill = buildBill(order);
  // Shop bills come from the POS: no shipping, tracking or status changes here.
  const isShop = order.channel === "POS";
  const cancelled = order.status === "CANCELLED";

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
            {isShop ? "Shop bill" : "Order"} #{order.orderNumber}
          </h1>
          {isShop && (
            <span className="rounded-full bg-gray-900 px-2.5 py-0.5 text-xs font-medium text-white">Shop</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/admin/orders/${order.id}/invoice?print=1`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Download Invoice
          </a>
          {isShop ? (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
                cancelled ? "bg-red-50 text-red-700 ring-red-600/10" : "bg-green-50 text-green-700 ring-green-600/20"
              }`}
            >
              {cancelled ? "Cancelled" : "Paid at the shop"}
            </span>
          ) : (
            <OrderStatusSelect orderId={order.id} initialStatus={order.status} />
          )}
        </div>
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
                      <p className="ml-4">
                        {item.mrp && item.mrp > item.price && (
                          <span className="mr-2 text-gray-400 line-through">₹{item.mrp.toLocaleString('en-IN')}</span>
                        )}
                        ₹{item.price.toLocaleString('en-IN')}
                      </p>
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
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-2 text-sm">
              {bill.saleSavings > 0 && (
                <>
                  <div className="flex justify-between text-gray-500">
                    <p>Total at MRP</p>
                    <p className="line-through">₹{bill.mrpTotal.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <p>Discount on MRP</p>
                    <p>-₹{bill.saleSavings.toLocaleString('en-IN')}</p>
                  </div>
                </>
              )}
              <div className="flex justify-between text-gray-500">
                <p>Subtotal</p>
                <p>₹{bill.subtotal.toLocaleString('en-IN')}</p>
              </div>
              {bill.couponDiscount > 0 && (
                <div className="flex justify-between text-green-700">
                  <p>Coupon discount{bill.couponCode ? ` (${bill.couponCode})` : ''}</p>
                  <p>-₹{bill.couponDiscount.toLocaleString('en-IN')}</p>
                </div>
              )}
              {bill.manualDiscount > 0 && (
                <div className="flex justify-between text-green-700">
                  <p>Discount at the counter{order.approvedBy ? ` (approved by ${order.approvedBy.name || order.approvedBy.email})` : ""}</p>
                  <p>-₹{bill.manualDiscount.toLocaleString('en-IN')}</p>
                </div>
              )}
              {!isShop && (
                <div className="flex justify-between text-gray-500">
                  <p>Shipping</p>
                  <p>{bill.shipping > 0 ? `₹${bill.shipping.toLocaleString('en-IN')}` : 'Free'}</p>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-semibold text-gray-900">
                <p>Total</p>
                <p>₹{order.total.toLocaleString('en-IN')}</p>
              </div>
              {bill.totalSavings > 0 && (
                <p className="text-right text-xs text-green-700">Customer saved ₹{bill.totalSavings.toLocaleString('en-IN')} on this order.</p>
              )}
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
                <p className="text-gray-500">{isShop ? "Contact" : "Email"}</p>
                <p className="font-medium text-gray-900">
                  {isShop ? [order.customerPhone, order.customerEmail].filter(Boolean).join(" · ") || "-" : order.customerEmail}
                </p>
              </div>
              {isShop && order.cashier && (
                <div>
                  <p className="text-gray-500">Served by</p>
                  <p className="font-medium text-gray-900">{order.cashier.name || order.cashier.email}</p>
                </div>
              )}
              {isShop && cancelled && (
                <div>
                  <p className="text-gray-500">Cancelled</p>
                  <p className="font-medium text-red-700">{order.cancelReason || "No reason given"}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500">Date</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(order.createdAt), "MMMM d, yyyy h:mm a")}
                </p>
              </div>
            </div>
          </div>

          {!isShop && (
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
          )}

          {!isShop && (
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
          )}
          
          {order.notes && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 shadow-sm">
              <h2 className="text-lg font-medium text-amber-900 mb-2">Needs attention</h2>
              <p className="text-sm text-amber-900">{order.notes}</p>
            </div>
          )}

          {isShop && order.payments.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h2>
              <div className="space-y-3 text-sm">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{p.method === "CASH" ? "Cash" : p.method === "UPI" ? "UPI" : "Card"}</p>
                      {p.tendered != null && p.tendered > p.amount && (
                        <p className="text-xs text-gray-500">Received ₹{p.tendered.toLocaleString("en-IN")}, change ₹{(p.tendered - p.amount).toLocaleString("en-IN")}</p>
                      )}
                      {p.reference && <p className="text-xs text-gray-500">Ref {p.reference}</p>}
                    </div>
                    <p className="font-medium text-gray-900">₹{p.amount.toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isShop && order.payment && (
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



