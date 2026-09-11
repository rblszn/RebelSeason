import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronRight, Plus, Minus } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { getProductBySlug, getProductsByCategory } from "@/lib/dal/products";
import { ProductClient } from "@/components/store/ProductClient";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const product = await getProductBySlug(resolvedParams.slug);

  if (!product) {
    return notFound();
  }

  // Get related products from the same category
  const relatedProducts = (await getProductsByCategory(product.category.slug)).filter(p => p.id !== product.id).slice(0, 4);

  const isOnSale = product.originalPrice && product.originalPrice > product.price;

  const serializedProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
    images: product.images,
    description: product.description,
    material: product.material,
    careInstructions: product.careInstructions,
    hasVariants: product.hasVariants,
    variants: product.variants.map(v => ({
      id: v.id,
      size: v.size,
      stock: v.stock
    }))
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      {/* Breadcrumb */}
      <nav className="flex text-[11px] font-medium tracking-[0.1em] uppercase text-muted-foreground mb-10">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3 mx-3 mt-[1px]" />
        <Link href="/products" className="hover:text-foreground transition-colors">Shop</Link>
        <ChevronRight className="w-3 h-3 mx-3 mt-[1px]" />
        <Link href={`/categories/${product.category.slug}`} className="hover:text-foreground transition-colors">{product.category.name}</Link>
        <ChevronRight className="w-3 h-3 mx-3 mt-[1px]" />
        <span className="text-foreground truncate">{product.name}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
        
        {/* Gallery */}
        <div className="flex-1">
          <div className="flex flex-col-reverse lg:flex-row gap-4 w-full">
            {/* Thumbnails */}
            <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 hide-scrollbar lg:w-20 shrink-0">
              {product.images.map((img, i) => (
                <button 
                  key={i} 
                  className={`relative w-16 lg:w-full bg-secondary overflow-hidden shrink-0 ${i === 0 ? 'ring-1 ring-foreground' : 'opacity-60 hover:opacity-100 transition-opacity'}`}
                  style={{ aspectRatio: '3/4' }}
                >
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${img}')` }} />
                </button>
              ))}
            </div>
            
            {/* Main Image */}
            <div 
              className="relative flex-1 bg-secondary overflow-hidden group w-full"
              style={{ aspectRatio: '3/4' }}
            >
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105" style={{ backgroundImage: `url('${product.images[0]}')` }} />
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="flex-1 lg:max-w-md xl:max-w-lg lg:py-10">
          <h1 className="font-heading text-4xl sm:text-5xl font-normal mb-4">{product.name}</h1>
          
          <div className="flex items-center gap-4 text-xl mb-10">
            {isOnSale ? (
              <>
                <span className="text-muted-foreground line-through text-lg">₹{product.originalPrice?.toLocaleString('en-IN')}</span>
                <span className="text-foreground font-medium">₹{product.price.toLocaleString('en-IN')}</span>
              </>
            ) : (
              <span className="text-foreground font-medium">₹{product.price.toLocaleString('en-IN')}</span>
            )}
          </div>

          <ProductClient product={serializedProduct} />

        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-24 lg:mt-32 pt-16 border-t border-border">
          <h2 className="font-heading text-2xl sm:text-3xl font-normal mb-8 text-center">You May Also Like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
