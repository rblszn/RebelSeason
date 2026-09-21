"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ExternalLink, Package } from "lucide-react";

export default function OrderDetailsClient({ order }: { order: any }) {
  const subtotal = order.subtotal || order.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const shipping = order.shipping || 0;
  const discount = order.discount || 0;
  const couponCode = order.couponCode;
  const paymentId = order.payment?.razorpayPaymentId || order.paymentId || "N/A";

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'SHIPPED': return 'bg-blue-100 text-blue-800';
      case 'DELIVERED': return 'bg-purple-100 text-purple-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back button */}
      <div>
        <Link href="/account" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Order History
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">Order #{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground mt-1">Placed on {formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${getStatusColor(order.status)}`}>
            {order.status}
          </span>
          {order.trackingUrl && (
            <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
              Track Order <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="border border-border rounded-lg overflow-hidden bg-white">
            <div className="bg-secondary/50 px-6 py-4 border-b border-border">
              <h2 className="font-semibold flex items-center gap-2"><Package className="w-4 h-4" /> Items ordered</h2>
            </div>
            <div className="divide-y divide-border">
              {order.items.map((item: any) => (
                <div key={item.id} className="p-6 flex gap-6">
                  <div className="w-20 h-24 bg-secondary rounded-md overflow-hidden relative flex-shrink-0">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No img</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link href={`/products/${item.product?.slug || ''}`} className="font-medium hover:underline">{item.name}</Link>
                        {item.variantName && <p className="text-sm text-muted-foreground mt-1">Size: {item.variantName}</p>}
                      </div>
                      <p className="font-semibold">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">Qty: {item.quantity} × ₹{item.price.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-border rounded-lg bg-white overflow-hidden">
            <div className="bg-secondary/50 px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Order Summary</h2>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{shipping > 0 ? `₹${shipping.toLocaleString("en-IN")}` : "Free"}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount {couponCode ? `(${couponCode})` : ""}</span>
                  <span>-₹{discount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-4 border-t border-border">
                <span>Total</span>
                <span>₹{order.total.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <div className="border border-border rounded-lg bg-white overflow-hidden">
            <div className="bg-secondary/50 px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Shipping Address</h2>
            </div>
            <div className="p-6 text-sm text-muted-foreground space-y-1">
              {(() => {
                const addr = typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress) : order.shippingAddress;
                return (
                  <>
                    <p className="font-medium text-foreground">{addr.name || addr.fullName || order.customerName}</p>
                    <p>{addr.street || addr.addressLine1}</p>
                    {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                    <p>{addr.city}, {addr.state} {addr.pincode || addr.postalCode}</p>
                    <p className="pt-2">Phone: {addr.phone || order.customerPhone}</p>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="border border-border rounded-lg bg-white overflow-hidden">
            <div className="bg-secondary/50 px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Payment Details</h2>
            </div>
            <div className="p-6 text-sm text-muted-foreground space-y-2">
              <div className="flex justify-between">
                <span>Method</span>
                <span className="font-medium text-foreground">Online Payment</span>
              </div>
              <div className="flex justify-between">
                <span>Transaction ID</span>
                <span className="font-mono text-xs">{paymentId}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
