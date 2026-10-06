import { ProductCard } from "@/components/product/ProductCard";
import { getProductPage, parsePage } from "@/lib/dal/catalog";
import { Pagination } from "@/components/ui/Pagination";

export const metadata = { title: "Shop All" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const page = parsePage(resolvedParams.page);
  const { products, total: totalCount, totalPages } = await getProductPage(page, null);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-16">
        <h1 className="font-heading text-5xl sm:text-6xl font-normal mb-6">Shop All</h1>
        <p className="text-muted-foreground text-[15px] font-light max-w-2xl">
          Discover our complete collection of effortless essentials and statement pieces.
        </p>
      </div>

      <div className="flex justify-center items-center py-4 border-y border-border mb-12">
        <div className="text-[12px] uppercase tracking-[0.1em] text-muted-foreground font-medium">
          {totalCount} Results
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-16">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} priority={i < 4} />
        ))}
      </div>

      {/* Pagination */}
      <Pagination totalPages={totalPages} currentPage={page} />
    </div>
  );
}
