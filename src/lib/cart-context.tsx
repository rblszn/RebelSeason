"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { MAX_QTY_PER_LINE } from "@/lib/pricing";

export type CartItem = {
  productId: string;
  variantId?: string;
  name: string;
  slug: string;
  size?: string;
  price: number;
  originalPrice?: number;
  image: string;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, size?: string) => void;
  updateQuantity: (productId: string, size: string | undefined, quantity: number) => void;
  clearCart: () => void;
  syncPrices: (prices: { productId: string; variantId: string | null; price: number }[]) => void;
  getTotal: () => number;
  getItemCount: () => number;
};

const CartContext = createContext<CartContextType | null>(null);

const CART_STORAGE_KEY = "rebel-season-cart";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter((i) => i && typeof i.productId === "string" && Number.isInteger(i.quantity) && i.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or blocked (private mode): the cart still works for this visit.
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setItems(loadCart());
    setMounted(true);
  }, []);

  // Persist to localStorage on every change (after initial hydration)
  useEffect(() => {
    if (mounted) {
      saveCart(items);
    }
  }, [items, mounted]);

  const addItem = useCallback((newItem: CartItem) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === newItem.productId && item.size === newItem.size
      );
      if (existingIndex >= 0) {
        // Increase quantity of existing item
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: Math.min(MAX_QTY_PER_LINE, updated[existingIndex].quantity + newItem.quantity),
        };
        return updated;
      }
      return [...prev, { ...newItem, quantity: Math.min(MAX_QTY_PER_LINE, newItem.quantity) }];
    });
  }, []);

  const removeItem = useCallback((productId: string, size?: string) => {
    setItems((prev) =>
      prev.filter((item) => !(item.productId === productId && item.size === size))
    );
  }, []);

  const updateQuantity = useCallback(
    (productId: string, size: string | undefined, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId, size);
        return;
      }
      setItems((prev) =>
        prev.map((item) =>
          item.productId === productId && item.size === size
            ? { ...item, quantity: Math.min(MAX_QTY_PER_LINE, quantity) }
            : item
        )
      );
    },
    [removeItem]
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // Apply server-confirmed prices (e.g. after an admin changed a price).
  const syncPrices = useCallback((prices: { productId: string; variantId: string | null; price: number }[]) => {
    setItems((prev) =>
      prev.map((item) => {
        const match = prices.find(
          (p) => p.productId === item.productId && (p.variantId ?? undefined) === (item.variantId ?? undefined)
        );
        return match ? { ...item, price: match.price } : item;
      })
    );
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const getItemCount = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, syncPrices, getTotal, getItemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
