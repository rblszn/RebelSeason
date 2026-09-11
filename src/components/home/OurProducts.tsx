import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductWithRelations } from "@/lib/dal";

interface OurProductsProps {
  products: ProductWithRelations[];
}

export function OurProducts({ products }: OurProductsProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="py-20 lg:py-24 bg-background">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 sm:mb-16 gap-6">
          <div>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-normal text-foreground">
              Our Products
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              Explore our complete collection.
            </p>
          </div>
          <Link 
            href="/products" 
            className="inline-block border-b border-foreground pb-1 text-[11px] font-semibold tracking-[0.15em] uppercase hover:text-muted-foreground hover:border-muted-foreground transition-colors"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 sm:gap-x-4 lg:gap-x-6 gap-y-10 sm:gap-y-12">
          {products.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

      </div>
    </section>
  );
}
