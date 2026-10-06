"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { cldImage } from "@/lib/images";

type SuccessOrder = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  couponCode: string | null;
  shippingAddress: unknown;
  createdAt: string;
  payment: { status: string; razorpayPaymentId: string | null } | null;
  items: { id: string; name: string; variantName: string | null; quantity: number; price: number; image: string | null }[];
};

export default function OrderSuccessClient({ order }: { order: SuccessOrder }) {
  const { subtotal, shipping, discount, couponCode } = order;
  const isPaid = order.payment?.status === "CAPTURED";
  const paymentId = order.payment?.razorpayPaymentId || "N/A";
  const router = useRouter();
  const refreshes = useRef(0);

  // Poll briefly while the webhook confirms the payment, then stop.
  useEffect(() => {
    if (isPaid || refreshes.current >= 6) return;
    const timer = setTimeout(() => {
      refreshes.current += 1;
      router.refresh();
    }, 5000);
    return () => clearTimeout(timer);
  }, [isPaid, order, router]);

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
            <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isPaid ? "bg-green-100 animate-pulse" : "bg-amber-100"}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white ${isPaid ? "bg-green-500" : "bg-amber-500"}`}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-heading font-bold text-gray-900 mb-2">
              {isPaid ? "Order Confirmed!" : "Payment Processing"}
            </h1>
            <p className="text-gray-500 text-lg">
              {isPaid
                ? "Thank you for your purchase."
                : "We're waiting for confirmation from the payment provider. This page updates automatically, and you'll get an email once it's confirmed."}
            </p>
          </div>

          <div className="p-8 sm:p-12">
            {/* Order Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 pb-10 border-b border-gray-100">
              <div>
                <p className="text-sm text-gray-500 mb-1">Order Number</p>
                <p className="font-semibold text-gray-900">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Date</p>
                <p className="font-semibold text-gray-900">{formatDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                {isPaid ? (
                  <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Paid ✓
                  </p>
                ) : (
                  <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Pending
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Payment ID</p>
                <p className="font-mono text-sm text-gray-900">{paymentId}</p>
              </div>
            </div>

            {/* Items */}
            <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">Order Items</h2>
            <div className="space-y-6 mb-10 pb-10 border-b border-gray-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center">
                  <div className="flex-shrink-0 w-16 h-20 bg-gray-100 rounded-md overflow-hidden relative">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cldImage(item.image, 200)}
                        alt={item.name || 'Product Image'}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-pink-100/50 flex items-center justify-center text-pink-300">
                         {/* Fallback image */}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{item.name || "Product"}</h3>
                    {item.variantName && <p className="text-sm text-gray-500 mt-1">Size: {item.variantName}</p>}
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
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <p>Discount {couponCode ? `(${couponCode})` : ""}</p>
                  <p>-₹{discount.toLocaleString("en-IN")}</p>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-gray-100">
                <p>Total</p>
                <p>₹{order.total.toLocaleString("en-IN")}</p>
              </div>
            </div>

            {/* Shipping Address */}
            {Boolean(order.shippingAddress) && (() => {
              const addr = (typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress) : order.shippingAddress) as Record<string, string>;
              return (
                <div className="mb-10 bg-gray-50 rounded-xl p-6">
                  <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4">Shipping Address</h2>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p className="font-medium text-gray-900">{addr.name || addr.fullName}</p>
                    <p>{addr.street || addr.addressLine1}</p>
                    {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                    <p>{addr.city}, {addr.state} {addr.pincode || addr.postalCode}</p>
                    <p className="pt-2 text-gray-500">Phone: {addr.phone}</p>
                  </div>
                </div>
              );
            })()}

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
