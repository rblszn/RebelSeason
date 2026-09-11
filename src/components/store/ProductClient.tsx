"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  material: string | null;
  careInstructions: string | null;
  hasVariants: boolean;
  variants: SerializedVariant[];
};

export function ProductClient({ product }: { product: SerializedProduct }) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const router = useRouter();

  const handleAdd = () => {
    if (product.hasVariants && !selectedSize) {
      alert("Please select a size before adding to cart.");
      return;
    }
    
    const variant = product.variants?.find(v => v.size === selectedSize);
    
    addItem({
      productId: product.id,
      variantId: variant?.id,
      name: product.name,
      slug: product.slug,
      size: selectedSize || undefined,
      price: product.price,
      originalPrice: product.originalPrice || undefined,
      image: product.images[0],
      quantity
    });
    
    alert("Added to cart!");
  };

  const handleBuyNow = () => {
    if (product.hasVariants && !selectedSize) {
      alert("Please select a size before proceeding.");
      return;
    }
    
    const variant = product.variants?.find(v => v.size === selectedSize);
    
    addItem({
      productId: product.id,
      variantId: variant?.id,
      name: product.name,
      slug: product.slug,
      size: selectedSize || undefined,
      price: product.price,
      originalPrice: product.originalPrice || undefined,
      image: product.images[0],
      quantity
    });
    
    router.push('/checkout');
  };

  return (
    <>
      <div className="space-y-8 mb-10">
        {/* Size Selection */}
        {product.hasVariants && product.variants && product.variants.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-semibold tracking-[0.1em] uppercase">Size</span>
              <Link href="#" className="text-[11px] font-medium tracking-[0.1em] text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors">Size Guide</Link>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {product.variants.map((variant) => (
                <button 
                  key={variant.id} 
                  disabled={variant.stock === 0}
                  onClick={() => setSelectedSize(variant.size)}
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
              onClick={() => setQuantity(quantity + 1)}
              className="flex-1 flex justify-center items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>
        </div>
      </div>

      <Button onClick={handleAdd} className="w-full h-14 rounded-none font-semibold uppercase tracking-[0.2em] text-[11px] mb-4 bg-foreground text-background hover:bg-foreground/90">
        Add to Cart
      </Button>
      
      <Button onClick={handleBuyNow} variant="outline" className="w-full h-14 rounded-none font-semibold uppercase tracking-[0.2em] text-[11px] bg-transparent border-foreground text-foreground hover:bg-foreground hover:text-background transition-colors mb-12">
        Buy it Now
      </Button>

      {/* Description Accordions */}
      <div className="border-t border-border pt-8 space-y-6 text-[14px] font-light text-muted-foreground leading-relaxed">
        <p>
          {product.description || `The ${product.name} is a versatile essential for your modern wardrobe. Designed with a relaxed fit and premium materials to ensure comfort without compromising on style. The clean lines and subtle details make it perfect for any occasion.`}
        </p>
        {product.material && (
          <p>
            <strong>Material:</strong> {product.material}
          </p>
        )}
        {product.careInstructions && (
          <p>
            <strong>Care:</strong> {product.careInstructions}
          </p>
        )}
        <div className="border-b border-border pb-4">
          <button className="flex justify-between items-center w-full text-foreground text-[13px] font-semibold tracking-[0.1em] uppercase py-2">
            Shipping & Returns
            <Plus className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>
      </div>
    </>
  );
}
