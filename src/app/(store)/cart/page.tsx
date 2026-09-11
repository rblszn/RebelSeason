"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Minus, Plus, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export default function CartPage() {
  const { items, updateQuantity, removeItem, getTotal } = useCart();
  
  const subtotal = getTotal();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1">
      <h1 className="font-heading text-3xl sm:text-4xl font-medium mb-8">Your Cart</h1>
      
      {items.length > 0 ? (
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Cart Items */}
          <div className="flex-1">
            <div className="hidden sm:grid grid-cols-12 gap-4 pb-4 border-b border-border text-sm font-medium text-muted-foreground uppercase tracking-widest text-[10px]">
              <div className="col-span-6">Product</div>
              <div className="col-span-3 text-center">Quantity</div>
              <div className="col-span-3 text-right">Total</div>
            </div>
            
            <div className="divide-y divide-border">
              {items.map((item, index) => (
                <div key={`${item.productId}-${item.size || 'default'}-${index}`} className="py-6 flex flex-col sm:grid sm:grid-cols-12 gap-4 items-start sm:items-center">
                  
                  {/* Product Info */}
                  <div className="col-span-6 flex gap-4 w-full">
                    <Link href={`/products/${item.slug}`} className="w-20 sm:w-24 aspect-[3/4] bg-secondary shrink-0 relative block">
                      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${item.image}')` }} />
                    </Link>
                    <div className="flex flex-col pt-1">
                      <Link href={`/products/${item.slug}`} className="font-medium hover:underline underline-offset-4 mb-1 text-sm sm:text-base">
                        {item.name}
                      </Link>
                      <span className="text-sm text-muted-foreground mb-1">
                        ₹{item.price.toLocaleString('en-IN')}
                      </span>
                      {item.size && (
                        <span className="text-xs text-muted-foreground">
                          Size: {item.size}
                        </span>
                      )}
                      <button 
                        onClick={() => removeItem(item.productId, item.size)}
                        className="text-xs text-muted-foreground underline underline-offset-2 mt-auto self-start sm:hidden pt-4"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="col-span-3 flex justify-start sm:justify-center w-full mt-4 sm:mt-0">
                    <div className="flex items-center border border-input w-28 h-9">
                      <button 
                        onClick={() => updateQuantity(item.productId, item.size, Math.max(1, item.quantity - 1))}
                        className="flex-1 flex justify-center items-center text-muted-foreground hover:text-foreground"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="flex-1 text-center text-sm font-medium">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                        className="flex-1 flex justify-center items-center text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Total & Remove */}
                  <div className="col-span-3 flex justify-between sm:justify-end items-center w-full mt-4 sm:mt-0 hidden sm:flex">
                    <span className="font-medium">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                    <button 
                      onClick={() => removeItem(item.productId, item.size)}
                      className="ml-4 text-muted-foreground hover:text-foreground p-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="w-full lg:w-[320px] shrink-0">
            <div className="bg-secondary p-6">
              <h2 className="font-heading text-xl font-medium mb-6 border-b border-border/50 pb-4">Order Summary</h2>
              <div className="space-y-4 text-sm mb-6 border-b border-border/50 pb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-muted-foreground text-xs">Calculated at checkout</span>
                </div>
              </div>
              <div className="flex justify-between font-medium text-lg mb-8">
                <span>Total</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <Button className="w-full h-12 rounded-none font-semibold uppercase tracking-widest text-sm" asChild>
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-8">Your cart is currently empty.</p>
          <Button asChild className="rounded-none px-8 font-semibold uppercase tracking-widest text-xs">
            <Link href="/products">Continue Shopping</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
