"use client";

import Link from "next/link";
import Image from "next/image";

export default function OrderSuccessClient({ order }: { order: any }) {
  const subtotal = order.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const shipping = order.total > subtotal ? order.total - subtotal : 0;
  
  const paymentId = order.payment?.razorpayPaymentId || order.paymentId || "N/A";

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-pink-50/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="p-8 sm:p-12 text-center border-b border-gray-100 bg-gradient-to-b from-green-50/50 to-white">
            <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-heading font-bold text-gray-900 mb-2">Order Confirmed!</h1>
            <p className="text-gray-500 text-lg">Thank you for your purchase.</p>
          </div>

          <div className="p-8 sm:p-12">
            {/* Order Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 pb-10 border-b border-gray-100">
              <div>
                <p className="text-sm text-gray-500 mb-1">Order Number</p>
                <p className="font-semibold text-gray-900">{order.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Date</p>
                <p className="font-semibold text-gray-900">{formatDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Paid ✓
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Payment ID</p>
                <p className="font-mono text-sm text-gray-900">{paymentId}</p>
              </div>
            </div>

            {/* Items */}
            <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">Order Items</h2>
            <div className="space-y-6 mb-10 pb-10 border-b border-gray-100">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex items-center">
                  <div className="flex-shrink-0 w-16 h-20 bg-gray-100 rounded-md overflow-hidden relative">
                    {item.product?.images?.[0] ? (
                      <Image
                        src={item.product.images[0]}
                        alt={item.product?.name || 'Product Image'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-pink-100/50 flex items-center justify-center text-pink-300">
                         {/* Fallback image */}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{item.product?.name || "Product"}</h3>
                    {item.size && <p className="text-sm text-gray-500 mt-1">Size: {item.size}</p>}
                    <p className="text-sm text-gray-500 mt-1">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Breakdown */}
            <div className="space-y-3 mb-10 pb-10 border-b border-gray-100 max-w-sm ml-auto">
              <div className="flex justify-between text-sm text-gray-500">
                <p>Subtotal</p>
                <p>₹{subtotal.toLocaleString("en-IN")}</p>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <p>Shipping</p>
                <p>{shipping > 0 ? `₹${shipping.toLocaleString("en-IN")}` : "Free"}</p>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-gray-100">
                <p>Total</p>
                <p>₹{order.total.toLocaleString("en-IN")}</p>
              </div>
            </div>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <div className="mb-10 bg-gray-50 rounded-xl p-6">
                <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4">Shipping Address</h2>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-medium text-gray-900">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                  <p className="pt-2 text-gray-500">Phone: {order.shippingAddress.phone}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
              <Link 
                href="/products" 
                className="inline-flex justify-center items-center px-8 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors w-full sm:w-auto"
              >
                Continue Shopping
              </Link>
              <Link 
                href="/account" 
                className="inline-flex justify-center items-center px-8 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors w-full sm:w-auto"
              >
                View Order History
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
