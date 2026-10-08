"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Plus, Minus, ChevronDown, Truck, Check } from "lucide-react";
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

/** Shows an "Only N left" nudge once stock gets this low. */
const LOW_STOCK_AT = 5;

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border-b border-border py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[12px] font-semibold uppercase tracking-[0.15em] text-foreground">
        {title}
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="pt-4 text-[14px] font-light leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}

export function ProductClient({
  product,
  deliveryDays,
  freeShippingThreshold,
}: {
  product: SerializedProduct;
  deliveryDays: string;
  freeShippingThreshold: number;
}) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState<{ kind: "error" | "added"; text: string } | null>(null);
  const { addItem } = useCart();
  const router = useRouter();

  const selectedVariant = product.variants?.find(v => v.size === selectedSize);
  const isSoldOut = product.hasVariants
    ? product.variants.every(v => v.stock <= 0)
    : product.stock <= 0;
  const available = product.hasVariants ? (selectedVariant?.stock ?? MAX_QTY_PER_LINE) : product.stock;
  const maxQty = Math.max(1, Math.min(MAX_QTY_PER_LINE, available));

  // Stock of what the shopper is looking at: the chosen size, or the whole product.
  const stockInView = product.hasVariants ? selectedVariant?.stock : product.stock;
  const lowStock = stockInView !== undefined && stockInView > 0 && stockInView <= LOW_STOCK_AT;

  const addSelectionToCart = (): boolean => {
    if (isSoldOut) return false;
    if (product.hasVariants && !selectedVariant) {
      setNotice({ kind: "error", text: `Please select a ${product.sizeLabel.toLowerCase()} first.` });
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
    if (addSelectionToCart()) setNotice({ kind: "added", text: "Added to your cart." });
  };

  const handleBuyNow = () => {
    if (addSelectionToCart()) router.push('/checkout');
  };

  return (
    <>
      <div className="space-y-8 mb-8">
        {/* Size Selection */}
        {product.hasVariants && product.variants && product.variants.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-semibold tracking-[0.1em] uppercase">
                {product.sizeLabel}
                {selectedSize && <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground">{selectedSize}</span>}
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3" role="radiogroup" aria-label={product.sizeLabel}>
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  role="radio"
                  aria-checked={selectedSize === variant.size}
                  disabled={variant.stock === 0}
                  onClick={() => {
                    setSelectedSize(variant.size);
                    setNotice(null);
                    setQuantity(q => Math.min(q, Math.max(1, Math.min(MAX_QTY_PER_LINE, variant.stock))));
                  }}
                  className={`min-h-12 px-1 text-[13px] font-medium border transition-colors ${
                    variant.stock === 0
                      ? 'border-border text-muted-foreground opacity-50 cursor-not-allowed bg-secondary/50 line-through'
                      : selectedSize === variant.size
                        ? 'border-foreground bg-foreground text-background'
                        : notice?.kind === "error"
                          ? 'border-red-400 text-foreground hover:border-foreground'
                          : 'border-border text-foreground hover:border-foreground'
                  }`}
                >
                  {variant.size}
                </button>
              ))}
            </div>
            {notice?.kind === "error" && (
              <p role="alert" className="mt-3 text-[13px] font-medium text-red-600">{notice.text}</p>
            )}
          </div>
        )}

        {/* Quantity */}
        <div>
          <span className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-3 block">Quantity</span>
          <div className="flex items-center border border-border w-32 h-12">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              aria-label="Decrease quantity"
              className="flex-1 flex justify-center items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Minus className="w-4 h-4 stroke-[1.5]" />
            </button>
            <span className="flex-1 text-center text-[13px] font-medium" aria-live="polite">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
              aria-label="Increase quantity"
              className="flex-1 flex justify-center items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>
        </div>
      </div>

      {isSoldOut ? (
        <p className="mb-4 text-sm font-medium text-red-600">This product is currently sold out.</p>
      ) : lowStock ? (
        <p className="mb-4 text-[13px] font-medium text-amber-700">
          Only {stockInView} left{selectedSize && product.hasVariants ? ` in ${selectedSize}` : ""}.
        </p>
      ) : null}

      <Button onClick={handleAdd} disabled={isSoldOut} className="w-full h-14 rounded-none font-semibold uppercase tracking-[0.2em] text-[11px] mb-4 bg-foreground text-background hover:bg-foreground/90">
        Add to Cart
      </Button>

      {notice?.kind === "added" && (
        <p role="status" className="mb-4 flex items-center gap-2 text-[13px] font-medium text-green-700">
          <Check className="h-4 w-4" /> {notice.text}{" "}
          <Link href="/cart" className="underline underline-offset-4">View cart</Link>
        </p>
      )}

      <Button onClick={handleBuyNow} disabled={isSoldOut} variant="outline" className="w-full h-14 rounded-none font-semibold uppercase tracking-[0.2em] text-[11px] bg-transparent border-foreground text-foreground hover:bg-foreground hover:text-background transition-colors mb-8">
        Buy it Now
      </Button>

      <div className="mb-10 flex items-start gap-3 border border-border px-4 py-3 text-[13px] text-muted-foreground">
        <Truck className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
        <p>
          Delivered in {deliveryDays}.{" "}
          Free shipping on orders over ₹{freeShippingThreshold.toLocaleString("en-IN")}.
        </p>
      </div>

      {/* Details */}
      <div className="border-t border-border">
        <Section title="Description" defaultOpen>
          <p>
            {product.description || `The ${product.name} is a versatile essential for your modern wardrobe. Designed with premium materials to ensure comfort without compromising on style.`}
          </p>
        </Section>
        {product.attributes.length > 0 && (
          <Section title="Product details" defaultOpen>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
              {product.attributes.map((attribute) => (
                <div key={attribute.label} className="contents">
                  <dt className="font-medium text-foreground">{attribute.label}</dt>
                  <dd>{attribute.value}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}
        {product.careInstructions && (
          <Section title="Care">
            <p>{product.careInstructions}</p>
          </Section>
        )}
        <Section title="Shipping & refunds">
          <p className="mb-3">Orders are delivered in {deliveryDays}. Read the full policies for details.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] font-semibold tracking-[0.1em] uppercase text-foreground">
            <Link href="/shipping" className="underline underline-offset-4 hover:text-muted-foreground">Shipping &amp; Delivery</Link>
            <Link href="/returns" className="underline underline-offset-4 hover:text-muted-foreground">Cancellation &amp; Refund Policy</Link>
          </div>
        </Section>
      </div>
    </>
  );
}
