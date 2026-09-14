import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductWithRelations } from "@/lib/dal/products";

interface ProductCardProps {
  product: ProductWithRelations;
}

export function ProductCard({ product }: ProductCardProps) {
  // Use a second image if available for hover effect, otherwise use the first
  const hoverImage = product.images.length > 1 ? product.images[1] : product.images[0];

  const isOnSale = product.originalPrice && product.originalPrice > product.price;

  return (
    <div className="group flex flex-col w-full">
      <Link 
        href={`/products/${product.slug}`} 
        className="relative overflow-hidden bg-secondary mb-5 block w-full"
        style={{ aspectRatio: '3/4' }}
      >
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out group-hover:opacity-0"
          style={{ backgroundImage: `url('${product.images[0]}')` }}
        />
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out opacity-0 group-hover:opacity-100 group-hover:scale-105"
          style={{ backgroundImage: `url('${hoverImage}')` }}
        />
        
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
          {(product.hasVariants ? (product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0) : product.stock) <= 0 && (
            <span className="bg-black/90 backdrop-blur-sm px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-sm">
              Sold Out
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 transform translate-y-4 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 flex justify-center z-20">
          <Button className="w-full bg-white/95 text-foreground hover:bg-white rounded-none shadow-md text-[11px] font-semibold uppercase tracking-[0.15em] h-11">
            Quick Add
          </Button>
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
      </div>
    </div>
  );
}
