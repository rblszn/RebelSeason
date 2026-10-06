"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { shippingFor } from "@/lib/pricing";
import { cldImage } from "@/lib/images";
import { siteConfig } from "@/lib/site-config";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type CheckoutSession = {
  userId: string;
  email: string;
  name: string;
  isLoggedIn: boolean;
};

type SavedAddress = {
  id: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
};

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
  open: () => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

export default function CheckoutClient({ session }: { session: CheckoutSession }) {
  const { items, getTotal, clearCart, syncPrices } = useCart();
  const router = useRouter();

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [email, setEmail] = useState(session?.email || "");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  // Set once Razorpay reports success, so clearing the cart doesn't flash the
  // empty-cart view while the payment is verified and we navigate away.
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  // Guest OTP states
  const [guestName, setGuestName] = useState("");
  const [guestOtp, setGuestOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [guestError, setGuestError] = useState("");
  const [guestVerified, setGuestVerified] = useState(false);

  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; name: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const [newAddress, setNewAddress] = useState({
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    pincode: ""
  });

  useEffect(() => {
    if (session.isLoggedIn) {
      fetch("/api/account/addresses")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAddresses(data);
            if (data.length > 0) {
              setSelectedAddressId(data[0].id);
            } else {
              setShowNewAddress(true);
            }
          }
        })
        .catch(console.error);
    } else {
      setShowNewAddress(true);
    }
  }, [session.isLoggedIn]);

  const cartPayload = () =>
    items.map((item) => ({ productId: item.productId, variantId: item.variantId ?? null, quantity: item.quantity }));

  // Email OTP handlers
  const handleSendOtp = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setGuestError("Please enter a valid email address");
      return;
    }
    setIsSendingOtp(true);
    setGuestError("");
    try {
      const res = await fetch("/api/auth/checkout/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowOtpInput(true);
      } else {
        if (data.exists || (data.error && data.error.toLowerCase().includes('exists'))) {
          setGuestError("Account already exists with this email.");
        } else {
          setGuestError(data.error || "Failed to send OTP");
        }
      }
    } catch {
      setGuestError("Unexpected error");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setIsVerifyingOtp(true);
    setGuestError("");
    try {
      const res = await fetch("/api/auth/checkout/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: guestOtp, email, name: guestName, phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setGuestVerified(true);
        // Pre-fill the address name/phone from the contact details just entered.
        setNewAddress((prev) => ({ ...prev, name: prev.name || guestName, phone: prev.phone || phone }));
        router.refresh();
      } else {
        setGuestError(data.error || "Verification failed");
      }
    } catch {
      setGuestError("Unexpected error");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Coupon handlers
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim().toUpperCase(), items: cartPayload() }),
      });
      const data = await res.json();
      if (res.ok) {
        setAppliedCoupon({ code: data.code, name: data.name, discount: data.discount });
        setCouponError("");
      } else {
        setCouponError(data.error || "Invalid coupon");
      }
    } catch {
      setCouponError("Failed to validate coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const subtotal = getTotal();
  const discount = appliedCoupon?.discount || 0;
  const shipping = shippingFor(subtotal);
  const total = Math.max(0, subtotal - discount + shipping);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError("");

    const finalAddress = showNewAddress
      ? newAddress
      : addresses.find(a => a.id === selectedAddressId);

    if (!finalAddress || !finalAddress.name || !finalAddress.street || !finalAddress.city || !finalAddress.state || !finalAddress.pincode) {
      setCheckoutError("Please provide a complete address.");
      return;
    }
    if (!/^\d{6}$/.test(finalAddress.pincode.trim())) {
      setCheckoutError("PIN code must be 6 digits.");
      return;
    }

    const finalPhone = finalAddress.phone || phone;
    if (!finalPhone) {
      setCheckoutError("Please provide a phone number for the order.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Start loading the payment SDK while the order is being created.
      const scriptPromise = loadRazorpayScript();

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartPayload(),
          address: { ...finalAddress, phone: finalPhone },
          phone: finalPhone,
          couponCode: appliedCoupon?.code || null,
          expectedTotal: total,
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "PRICE_CHANGED" && Array.isArray(data.prices)) {
          syncPrices(data.prices);
          if (appliedCoupon) handleRemoveCoupon();
        }
        if (data.code === "COUPON_INVALID") handleRemoveCoupon();
        setCheckoutError(data.error || "Could not place the order. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const isLoaded = await scriptPromise;
      if (!isLoaded || !window.Razorpay) {
        setCheckoutError("The payment window failed to load. Please check your connection and try again.");
        setIsSubmitting(false);
        return;
      }

      let paymentFailed = false;
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'The Rebel Season',
        description: 'Order Payment',
        order_id: data.razorpayOrderId,
        prefill: { name: finalAddress.name, email, contact: finalPhone },
        theme: { color: '#E91E63' },
        handler: async (response: RazorpayResponse) => {
          // Razorpay has taken the payment; the server double-checks it, and
          // the webhook confirms the order even if this request never lands.
          setConfirmingPayment(true);
          clearCart();
          try {
            await fetch('/api/orders/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
          } catch (err) {
            console.error("Payment verification request failed:", err);
          }
          router.push(`/order-success?id=${data.orderId}`);
        },
        modal: {
          ondismiss: () => {
            if (paymentFailed) {
              router.push(`/order-failed?id=${data.orderId}`);
            } else {
              setCheckoutError("Payment was cancelled. You can try again whenever you're ready.");
              setIsSubmitting(false);
            }
          }
        }
      });
      // Razorpay lets the customer retry inside the same window after a
      // failed attempt, so only remember the failure here.
      rzp.on('payment.failed', () => {
        paymentFailed = true;
      });
      rzp.open();

    } catch (error) {
      console.error(error);
      setCheckoutError(error instanceof Error ? error.message : "Failed to place order.");
      setIsSubmitting(false);
    }
  };

  if (confirmingPayment) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-24 px-4" role="status" aria-live="polite">
        <div className="w-10 h-10 border-2 border-foreground border-t-transparent rounded-full animate-spin mb-6" />
        <h1 className="font-heading text-2xl font-medium mb-2">Payment received</h1>
        <p className="text-sm text-muted-foreground">Confirming your order, please don&apos;t close this page…</p>
      </div>
    );
  }

  if (items.length === 0) return <div className="text-center py-20">Your cart is empty. <Link href="/products" className="underline">Go shopping</Link></div>;

  const isCheckoutDisabled = !session.isLoggedIn && !guestVerified;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1">
      <div className="flex flex-col-reverse lg:flex-row gap-12 lg:gap-24">
        
        {/* Left Form Area */}
        <div className="flex-1 max-w-2xl">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-medium mb-2">Checkout</h1>
            {!session.isLoggedIn && (
              <p className="text-sm text-muted-foreground">Already have an account? <Link href="/login" className="text-foreground underline underline-offset-4">Log in</Link></p>
            )}
          </div>

          <form onSubmit={handlePlaceOrder} className="space-y-10">
            {/* Contact — Guest Email OTP */}
            {!session.isLoggedIn && !guestVerified && (
              <section>
                <h2 className="text-lg font-medium mb-4">Contact Information</h2>
                <div className="space-y-4">
                  <Input type="text" placeholder="Full Name" value={guestName} onChange={(e) => setGuestName(e.target.value)} required className="w-full h-12 rounded-none bg-secondary/50 border-border" />
                  
                  <div className="flex gap-2">
                    <Input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required className="flex-1 h-12 rounded-none bg-secondary/50 border-border" />
                    <Button type="button" onClick={handleSendOtp} disabled={isSendingOtp || !email} className="h-12 px-6 bg-foreground text-background">
                      {isSendingOtp ? "Sending..." : "Get OTP"}
                    </Button>
                  </div>

                  <Input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full h-12 rounded-none bg-secondary/50 border-border" />
                  
                  {guestError && (
                    <div className="text-sm text-red-500 mt-2">
                      {guestError} {guestError.includes('exists') && <Link href="/login" className="underline font-medium">Login Here</Link>}
                    </div>
                  )}

                  {showOtpInput && (
                    <div className="mt-4 p-4 border border-border bg-secondary/20 space-y-4">
                      <p className="text-sm text-muted-foreground">Enter the 6-digit OTP sent to your email.</p>
                      <Input type="text" maxLength={6} placeholder="123456" value={guestOtp} onChange={(e) => setGuestOtp(e.target.value)} required className="w-full h-12 text-center tracking-[0.5em] text-lg rounded-none bg-background border-border" />
                      <Button type="button" onClick={handleVerifyOtp} disabled={isVerifyingOtp || guestOtp.length < 6} className="w-full h-12 bg-primary text-primary-foreground">
                        {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            )}
            
            {(!session.isLoggedIn && guestVerified) && (
              <section className="p-4 bg-green-50 border border-green-100 text-green-800 text-sm">
                Email verified successfully! You can now place your order.
              </section>
            )}

            {/* Shipping */}
            <section>
              <h2 className="text-lg font-medium mb-4">Shipping Address</h2>
              
              {addresses.length > 0 && !showNewAddress && (
                <div className="space-y-4 mb-4">
                  {addresses.map((addr) => (
                    <label key={addr.id} className="flex items-start gap-3 p-4 border border-border cursor-pointer bg-secondary/20 hover:bg-secondary/30 transition-colors">
                      <input type="radio" name="address" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} className="mt-1" />
                      <div className="text-sm">
                        <p className="font-medium">{addr.name}</p>
                        <p className="text-muted-foreground">{addr.street}</p>
                        <p className="text-muted-foreground">{addr.city}, {addr.state} {addr.pincode}</p>
                      </div>
                    </label>
                  ))}
                  <Button type="button" variant="outline" onClick={() => setShowNewAddress(true)} className="w-full">
                    Add New Address
                  </Button>
                </div>
              )}

              {showNewAddress && (
                <div className="grid grid-cols-2 gap-4">
                  {addresses.length > 0 && (
                    <div className="col-span-2 mb-2">
                      <Button type="button" variant="ghost" onClick={() => setShowNewAddress(false)} className="p-0 h-auto text-sm underline">
                        Cancel &amp; use saved address
                      </Button>
                    </div>
                  )}
                  <Input type="text" placeholder="Full Name" required value={newAddress.name} onChange={e => setNewAddress({...newAddress, name: e.target.value})} className="w-full h-12 rounded-none bg-secondary/50 border-border col-span-2" />
                  <Input type="tel" placeholder="Phone Number" required value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} className="w-full h-12 rounded-none bg-secondary/50 border-border col-span-2" />
                  <Input type="text" placeholder="Street Address" required value={newAddress.street} onChange={e => setNewAddress({...newAddress, street: e.target.value})} className="w-full h-12 rounded-none bg-secondary/50 border-border col-span-2" />
                  <Input type="text" placeholder="City" required value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} className="w-full h-12 rounded-none bg-secondary/50 border-border col-span-2 sm:col-span-1" />
                  <Input type="text" placeholder="State" required value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} className="w-full h-12 rounded-none bg-secondary/50 border-border col-span-2 sm:col-span-1" />
                  <Input type="text" inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="PIN Code" required value={newAddress.pincode} onChange={e => setNewAddress({...newAddress, pincode: e.target.value})} className="w-full h-12 rounded-none bg-secondary/50 border-border col-span-2 sm:col-span-1" />
                </div>
              )}
            </section>

            {/* Coupon */}
            <section>
              <h2 className="text-lg font-medium mb-4">Coupon Code</h2>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-4 border border-green-200 bg-green-50 text-sm">
                  <div>
                    <span className="font-medium text-green-800">{appliedCoupon.code}</span>
                    <span className="text-green-600 ml-2">— {appliedCoupon.name}</span>
                    <span className="text-green-700 ml-2 font-semibold">(-₹{appliedCoupon.discount})</span>
                  </div>
                  <button type="button" onClick={handleRemoveCoupon} className="text-red-500 text-xs underline hover:text-red-700">Remove</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 h-12 rounded-none bg-secondary/50 border-border uppercase tracking-widest"
                    />
                    <Button type="button" onClick={handleApplyCoupon} disabled={isApplyingCoupon || !couponCode.trim()} variant="outline" className="h-12 px-6 rounded-none">
                      {isApplyingCoupon ? "Applying..." : "Apply"}
                    </Button>
                  </div>
                  {couponError && <p className="text-sm text-red-500">{couponError}</p>}
                </div>
              )}
            </section>

            {checkoutError && (
              <div role="alert" className="p-4 border border-red-200 bg-red-50 text-sm text-red-700">
                {checkoutError}
              </div>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">
              All sales are final: confirmed orders cannot be cancelled, returned or refunded, except for damaged or
              incorrect items. Estimated delivery: {siteConfig.deliveryDays}. By placing this order you agree to our{" "}
              <Link href="/terms" target="_blank" className="underline underline-offset-2">Terms</Link>,{" "}
              <Link href="/returns" target="_blank" className="underline underline-offset-2">Cancellation &amp; Refund Policy</Link> and{" "}
              <Link href="/shipping" target="_blank" className="underline underline-offset-2">Shipping Policy</Link>.
            </p>

            <Button type="submit" disabled={isSubmitting || isCheckoutDisabled} className={`w-full h-14 rounded-none font-semibold uppercase tracking-widest text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors ${isCheckoutDisabled ? "opacity-50 cursor-not-allowed" : ""}`}>
              {isSubmitting ? "Processing..." : `Pay Now ₹${total.toLocaleString("en-IN")}`}
            </Button>
            
            <div className="text-center mt-6">
              <Link href="/cart" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
                Return to cart
              </Link>
            </div>
          </form>
        </div>

        {/* Right Summary Area */}
        <div className="w-full lg:w-96 shrink-0">
          <div className="bg-secondary/50 p-6 sm:p-8 lg:sticky lg:top-24">
            <h2 className="font-heading text-xl font-medium mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6 pb-6 border-b border-border/50">
              {items.map((item) => (
                <div key={`${item.productId}-${item.size || "default"}`} className="flex gap-4 items-center">
                  <div className="relative w-16 aspect-[3/4] bg-background">
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${cldImage(item.image, 200)}')` }} />
                    <span className="absolute -top-2 -right-2 bg-foreground text-background w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium">{item.quantity}</span>
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-medium">{item.name}</p>
                    {item.size && <p className="text-muted-foreground text-xs">{item.size}</p>}
                  </div>
                  <span className="text-sm font-medium">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 text-sm mb-6 pb-6 border-b border-border/50">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-green-700">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span className="font-medium">-₹{discount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">{shipping === 0 ? "Free" : `₹${shipping}`}</span>
              </div>
            </div>
            
            <div className="flex justify-between font-medium text-xl">
              <span>Total</span>
              <span>₹{total.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
