"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CheckoutClient({ session }: { session: any }) {
  const { items, getTotal, clearCart } = useCart();
  const router = useRouter();
  
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [email, setEmail] = useState(session?.email || "");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  const subtotal = getTotal();
  const shipping = subtotal > 2000 ? 0 : 100;
  const total = subtotal + shipping;

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let finalAddress = null;
      if (showNewAddress) {
        finalAddress = newAddress;
      } else {
        finalAddress = addresses.find(a => a.id === selectedAddressId);
      }

      if (!finalAddress || !finalAddress.street || !finalAddress.city || !finalAddress.state || !finalAddress.pincode) {
        alert("Please provide a complete address");
        setIsSubmitting(false);
        return;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          address: finalAddress,
          phone: phone || finalAddress.phone || "",
          email: email
        })
      });

      if (!res.ok) throw new Error("Order failed");
      const data = await res.json();

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        alert("Razorpay SDK failed to load");
        setIsSubmitting(false);
        return;
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'The Rebel Season',
        description: 'Order Payment',
        order_id: data.razorpayOrderId,
        prefill: { email, contact: phone || finalAddress.phone || "" },
        theme: { color: '#E91E63' },
        handler: async (response: any) => {
          // Verify payment
          const verifyRes = await fetch('/api/orders/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: data.orderId,
            }),
          });
          if (verifyRes.ok) {
            clearCart();
            router.push(`/order-success?id=${data.orderId}`);
          } else {
            router.push(`/order-failed?id=${data.orderId}`);
          }
        },
        modal: {
          ondismiss: () => {
            router.push(`/order-failed?id=${data.orderId}`);
          }
        }
      };
      
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        router.push(`/order-failed?id=${data.orderId}`);
      });
      rzp.open();

    } catch (error) {
      console.error(error);
      alert("Failed to place order.");
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) return <div className="text-center py-20">Your cart is empty. <Link href="/products" className="underline">Go shopping</Link></div>;

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
            {/* Contact */}
            {!session.isLoggedIn && (
              <section>
                <h2 className="text-lg font-medium mb-4">Contact Information</h2>
                <div className="space-y-4">
                  <Input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full h-12 rounded-none bg-secondary/50 border-border" />
                  <Input type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full h-12 rounded-none bg-secondary/50 border-border" />
                </div>
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
                        Cancel & use saved address
                      </Button>
                    </div>
                  )}
                  <Input type="text" placeholder="Full Name" required value={newAddress.name} onChange={e => setNewAddress({...newAddress, name: e.target.value})} className="w-full h-12 rounded-none bg-secondary/50 border-border col-span-2" />
                  <Input type="tel" placeholder="Phone" required value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} className="w-full h-12 rounded-none bg-secondary/50 border-border col-span-2" />
                  <Input type="text" placeholder="Street Address" required value={newAddress.street} onChange={e => setNewAddress({...newAddress, street: e.target.value})} className="w-full h-12 rounded-none bg-secondary/50 border-border col-span-2" />
                  <Input type="text" placeholder="City" required value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} className="w-full h-12 rounded-none bg-secondary/50 border-border col-span-2 sm:col-span-1" />
                  <Input type="text" placeholder="State" required value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} className="w-full h-12 rounded-none bg-secondary/50 border-border col-span-2 sm:col-span-1" />
                  <Input type="text" placeholder="PIN Code" required value={newAddress.pincode} onChange={e => setNewAddress({...newAddress, pincode: e.target.value})} className="w-full h-12 rounded-none bg-secondary/50 border-border col-span-2 sm:col-span-1" />
                </div>
              )}
            </section>

            <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-none font-semibold uppercase tracking-widest text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors">
              {isSubmitting ? "Processing..." : `Pay Now ₹${total}`}
            </Button>
            
            <div className="text-center mt-6">
              <Link href="/cart" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
                Return to cart
              </Link>
            </div>
          </form>
        </div>

        {/* Right Summary Area */}
        <div className="w-full lg:w-[400px] shrink-0">
          <div className="bg-secondary/50 p-6 sm:p-8 lg:sticky lg:top-24">
            <h2 className="font-heading text-xl font-medium mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6 pb-6 border-b border-border/50">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-4 items-center">
                  <div className="relative w-16 aspect-[3/4] bg-background">
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${item.image}')` }} />
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
                <span className="font-medium">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">{shipping === 0 ? "Free" : `₹${shipping}`}</span>
              </div>
            </div>
            
            <div className="flex justify-between font-medium text-xl">
              <span>Total</span>
              <span>₹{total}</span>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
