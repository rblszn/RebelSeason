import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductClient } from "@/components/store/ProductClient";
import { ProductGallery } from "@/components/store/ProductGallery";
import { getProductDetail } from "@/lib/dal/catalog";
import { cldImage } from "@/lib/images";

// Rendered on first visit, then served from cache until the catalog changes.
export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "FREE"];

function sizeRank(size: string) {
  const i = SIZE_ORDER.indexOf(size.toUpperCase());
  return i === -1 ? SIZE_ORDER.length : i;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProductDetail(slug);
  if (!data) return { title: "Product not found" };
  const { product } = data;
  return {
    title: product.name,
    description: product.description?.slice(0, 160) || `Shop ${product.name} at The Rebel Season.`,
    openGraph: product.images[0] ? { images: [cldImage(product.images[0], 1200)] } : undefined,
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getProductDetail(slug);

  if (!data) {
    return notFound();
  }
  const { product, related: relatedProducts } = data;

  const isOnSale = product.originalPrice && product.originalPrice > product.price;

  const serializedProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    originalPrice: product.originalPrice ?? null,
    images: product.images,
    description: product.description,
    material: product.material,
    careInstructions: product.careInstructions,
    hasVariants: product.hasVariants,
    stock: product.stock,
    variants: [...product.variants]
      .sort((a, b) => sizeRank(a.size) - sizeRank(b.size))
      .map((v) => ({ id: v.id, size: v.size, stock: v.stock })),
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
          <ProductGallery images={product.images} name={product.name} />
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
