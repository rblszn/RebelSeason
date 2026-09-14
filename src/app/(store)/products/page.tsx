import { ProductCard } from "@/components/product/ProductCard";
import { getAllProducts, getProductsCount } from "@/lib/dal/products";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const page = resolvedParams.page ? parseInt(resolvedParams.page as string, 10) : 1;
  const limit = 12;
  const skip = (page - 1) * limit;

  const [products, totalCount] = await Promise.all([
    getAllProducts({ skip, limit }),
    getProductsCount(),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-16">
        <h1 className="font-heading text-5xl sm:text-6xl font-normal mb-6">Shop All</h1>
        <p className="text-muted-foreground text-[15px] font-light max-w-2xl">
          Discover our complete collection of effortless essentials and statement pieces.
        </p>
      </div>

      {/* Toolbar (Filters & Sorting) */}
      <div className="flex justify-between items-center py-4 border-y border-border mb-12">
        <Button variant="ghost" className="text-[12px] uppercase tracking-[0.1em] font-semibold gap-2 hover:bg-transparent">
          <SlidersHorizontal className="w-4 h-4 stroke-[1.5]" />
          Filter
        </Button>
        <div className="text-[12px] uppercase tracking-[0.1em] text-muted-foreground hidden sm:block font-medium">
          {totalCount} Results
        </div>
        <Button variant="ghost" className="text-[12px] uppercase tracking-[0.1em] font-semibold gap-2 hover:bg-transparent">
          Sort: Recommended
          <ChevronDown className="w-4 h-4 stroke-[1.5]" />
        </Button>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-16">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Pagination */}
      <Pagination totalPages={totalPages} currentPage={page} />
    </div>
  );
}
