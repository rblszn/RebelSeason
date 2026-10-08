"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MAX_QTY_PER_LINE } from "@/lib/pricing";

type SerializedVariant = {
  id: string;
  size: string;
  stock: number;
};

type SerializedProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number | null;
  images: string[];
  description: string | null;
  attributes: { label: string; value: string }[];
  careInstructions: string | null;
  hasVariants: boolean;
  sizeLabel: string;
  stock: number;
  variants: SerializedVariant[];
};

export function ProductClient({ product }: { product: SerializedProduct }) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const router = useRouter();

  const selectedVariant = product.variants?.find(v => v.size === selectedSize);
  const isSoldOut = product.hasVariants
    ? product.variants.every(v => v.stock <= 0)
    : product.stock <= 0;
  const available = product.hasVariants ? (selectedVariant?.stock ?? MAX_QTY_PER_LINE) : product.stock;
  const maxQty = Math.max(1, Math.min(MAX_QTY_PER_LINE, available));

  const addSelectionToCart = (): boolean => {
    if (isSoldOut) return false;
    if (product.hasVariants && !selectedVariant) {
      alert(`Please select a ${product.sizeLabel.toLowerCase()} first.`);
      return false;
    }
    const variant = selectedVariant;
    addItem({
      productId: product.id,
      variantId: variant?.id,
      name: product.name,
      slug: product.slug,
      size: selectedSize || undefined,
      price: product.price,
      originalPrice: product.originalPrice || undefined,
      image: product.images[0],
      quantity: Math.min(quantity, maxQty)
    });
    return true;
  };

  const handleAdd = () => {
    if (addSelectionToCart()) alert("Added to cart!");
  };

  const handleBuyNow = () => {
    if (addSelectionToCart()) router.push('/checkout');
  };

  return (
    <>
      <div className="space-y-8 mb-10">
        {/* Size Selection */}
        {product.hasVariants && product.variants && product.variants.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-semibold tracking-[0.1em] uppercase">{product.sizeLabel}</span>

            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {product.variants.map((variant) => (
                <button 
                  key={variant.id} 
                  disabled={variant.stock === 0}
                  onClick={() => { setSelectedSize(variant.size); setQuantity(q => Math.min(q, Math.max(1, Math.min(MAX_QTY_PER_LINE, variant.stock)))); }}
                  className={`h-12 text-[13px] font-medium border transition-colors ${
                    variant.stock === 0 
                      ? 'border-border text-muted-foreground opacity-50 cursor-not-allowed bg-secondary/50 line-through' 
                      : selectedSize === variant.size
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border text-foreground hover:border-foreground'
                  }`}
                >
                  {variant.size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity */}
        <div>
          <span className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-3 block">Quantity</span>
          <div className="flex items-center border border-border w-32 h-12">
            <button 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="flex-1 flex justify-center items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Minus className="w-4 h-4 stroke-[1.5]" />
            </button>
            <span className="flex-1 text-center text-[13px] font-medium">{quantity}</span>
            <button 
              onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
              className="flex-1 flex justify-center items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>
        </div>
      </div>

      {isSoldOut && (
        <p className="mb-4 text-sm font-medium text-red-600">This product is currently sold out.</p>
      )}

      <Button onClick={handleAdd} disabled={isSoldOut} className="w-full h-14 rounded-none font-semibold uppercase tracking-[0.2em] text-[11px] mb-4 bg-foreground text-background hover:bg-foreground/90">
        Add to Cart
      </Button>
      
      <Button onClick={handleBuyNow} disabled={isSoldOut} variant="outline" className="w-full h-14 rounded-none font-semibold uppercase tracking-[0.2em] text-[11px] bg-transparent border-foreground text-foreground hover:bg-foreground hover:text-background transition-colors mb-12">
        Buy it Now
      </Button>

      {/* Description Accordions */}
      <div className="border-t border-border pt-8 space-y-6 text-[14px] font-light text-muted-foreground leading-relaxed">
        <p>
          {product.description || `The ${product.name} is a versatile essential for your modern wardrobe. Designed with a relaxed fit and premium materials to ensure comfort without compromising on style. The clean lines and subtle details make it perfect for any occasion.`}
        </p>
        {product.attributes.length > 0 && (
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
            {product.attributes.map((attribute) => (
              <div key={attribute.label} className="contents">
                <dt className="font-medium text-foreground">{attribute.label}</dt>
                <dd>{attribute.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {product.careInstructions && (
          <p>
            <strong>Care:</strong> {product.careInstructions}
          </p>
        )}
        <div className="border-b border-border pb-4 flex flex-wrap gap-x-6 gap-y-2 text-[12px] font-semibold tracking-[0.1em] uppercase text-foreground">
          <Link href="/shipping" className="underline underline-offset-4 hover:text-muted-foreground">Shipping &amp; Delivery</Link>
          <Link href="/returns" className="underline underline-offset-4 hover:text-muted-foreground">Cancellation &amp; Refund Policy</Link>
        </div>
      </div>
    </>
  );
}
