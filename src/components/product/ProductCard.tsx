/* eslint-disable @next/next/no-img-element -- Cloudinary already serves resized, optimised images */
import Link from "next/link";
import type { ProductCardData } from "@/lib/dal/catalog";
import { cldImage } from "@/lib/images";
import { compareSizes } from "@/lib/catalog-config";

interface ProductCardProps {
  product: ProductCardData;
  /** Set for the first row of a page so the browser fetches those images immediately. */
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const primary = cldImage(product.images[0], 800);
  // Second image is only used for the hover swap.
  const hover = product.images.length > 1 ? cldImage(product.images[1], 800) : null;

  const isOnSale = product.originalPrice && product.originalPrice > product.price;
  const totalStock = product.hasVariants
    ? product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
    : product.stock;

  // Clothing cards list the sizes still in stock; other departments show none.
  const availableSizes =
    product.category.type === "CLOTHING" && product.hasVariants
      ? product.variants.filter((v) => v.stock > 0).map((v) => v.size).sort(compareSizes)
      : [];

  return (
    <div className="group flex flex-col w-full">
      <Link
        href={`/products/${product.slug}`}
        className="relative overflow-hidden bg-secondary mb-5 block w-full"
        style={{ aspectRatio: '3/4' }}
      >
        {primary && (
          <img
            src={primary}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${hover ? "group-hover:opacity-0" : ""}`}
          />
        )}
        {hover && (
          <img
            src={hover}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out opacity-0 group-hover:opacity-100 group-hover:scale-105"
          />
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {product.isNew && (
            <span className="bg-white/95 backdrop-blur-sm px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground shadow-sm">
              New
            </span>
          )}
          {isOnSale && (
            <span className="bg-primary/90 backdrop-blur-sm px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-sm">
              Sale
            </span>
          )}
          {totalStock <= 0 && (
            <span className="bg-black/90 backdrop-blur-sm px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-sm">
              Sold Out
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 transform translate-y-4 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 flex justify-center z-20">
          <span className="w-full inline-flex items-center justify-center bg-white/95 text-foreground hover:bg-white rounded-none shadow-md text-[11px] font-semibold uppercase tracking-[0.15em] h-11">
            View Product
          </span>
        </div>
      </Link>

      <div className="flex flex-col text-center space-y-1.5 px-2">
        <Link
          href={`/products/${product.slug}`}
          className="text-[13px] font-medium tracking-wide hover:text-muted-foreground transition-colors"
        >
          {product.name}
        </Link>
        <div className="flex items-center justify-center gap-3 text-[13px]">
          {isOnSale ? (
            <>
              <span className="text-muted-foreground line-through">₹{product.originalPrice?.toLocaleString('en-IN')}</span>
              <span className="text-foreground font-medium">₹{product.price.toLocaleString('en-IN')}</span>
            </>
          ) : (
            <span className="text-foreground">₹{product.price.toLocaleString('en-IN')}</span>
          )}
        </div>
        {availableSizes.length > 0 && (
          <p className="text-[11px] tracking-wide text-muted-foreground" aria-label={`Available sizes: ${availableSizes.join(", ")}`}>
            {availableSizes.join("  ·  ")}
          </p>
        )}
      </div>
    </div>
  );
}
