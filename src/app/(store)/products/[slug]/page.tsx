import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductClient } from "@/components/store/ProductClient";
import { ProductGallery } from "@/components/store/ProductGallery";
import { getProductDetail } from "@/lib/dal/catalog";
import { cldImage } from "@/lib/images";
import { compareSizes, getTypeConfig, isProductType } from "@/lib/catalog-config";
import { siteConfig } from "@/lib/site-config";

// Rendered on first visit, then served from cache until the catalog changes.
export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
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

  // What shoppers see under the price depends on the department (fabric for
  // clothing, dimensions for bags, shape and finish for nail extensions ...).
  const typeConfig = isProductType(product.category.type) ? getTypeConfig(product.category.type) : null;
  const attributes = (typeConfig?.fields ?? [])
    .map((field) => ({ label: field.label, value: product[field.key] }))
    .filter((a): a is { label: string; value: string } => !!a.value);
  const department = product.category.parent;
  const saving = isOnSale ? (product.originalPrice as number) - product.price : 0;
  const savingPercent = isOnSale ? Math.round((saving / (product.originalPrice as number)) * 100) : 0;
  const inStock = product.hasVariants ? product.variants.some((v) => v.stock > 0) : product.stock > 0;

  // Lets search engines show price and availability next to the listing.
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: product.images.map((image) => cldImage(image, 1200)),
    brand: { "@type": "Brand", name: siteConfig.brandName },
    color: product.color || undefined,
    material: product.material || undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  const serializedProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    originalPrice: product.originalPrice ?? null,
    images: product.images,
    description: product.description,
    attributes,
    careInstructions: product.careInstructions,
    hasVariants: product.hasVariants,
    sizeLabel: typeConfig?.size.label ?? "Size",
    stock: product.stock,
    variants: [...product.variants]
      .sort((a, b) => compareSizes(a.size, b.size))
      .map((v) => ({ id: v.id, size: v.size, stock: v.stock })),
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <script
        type="application/ld+json"
        // "<" is escaped so product text can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      {/* Breadcrumb */}
      <nav className="flex text-[11px] font-medium tracking-[0.1em] uppercase text-muted-foreground mb-10">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3 mx-3 mt-[1px]" />
        <Link href="/products" className="hover:text-foreground transition-colors">Shop</Link>
        <ChevronRight className="w-3 h-3 mx-3 mt-[1px]" />
        {department && (
          <>
            <Link href={`/categories/${department.slug}`} className="hover:text-foreground transition-colors">{department.name}</Link>
            <ChevronRight className="w-3 h-3 mx-3 mt-[1px]" />
          </>
        )}
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

          <div className="flex items-center gap-4 text-xl mb-3">
            {isOnSale ? (
              <>
                <span className="text-muted-foreground line-through text-lg">₹{product.originalPrice?.toLocaleString('en-IN')}</span>
                <span className="text-foreground font-medium">₹{product.price.toLocaleString('en-IN')}</span>
              </>
            ) : (
              <span className="text-foreground font-medium">₹{product.price.toLocaleString('en-IN')}</span>
            )}
          </div>

          {isOnSale ? (
            <p className="mb-10">
              <span className="inline-block bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary-foreground">
                Save ₹{saving.toLocaleString("en-IN")} ({savingPercent}% off)
              </span>
            </p>
          ) : (
            <div className="mb-7" />
          )}

          <ProductClient
            product={serializedProduct}
            deliveryDays={siteConfig.deliveryDays}
            freeShippingThreshold={siteConfig.freeShippingThreshold}
          />

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
