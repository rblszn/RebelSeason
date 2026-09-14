import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/dal/categories";
import { getAllProducts, getProductsCount } from "@/lib/dal/products";
import { Pagination } from "@/components/ui/Pagination";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page as string, 10) : 1;
  const limit = 12;
  const skip = (page - 1) * limit;

  let categoryName = "";
  let products = [];
  let totalCount = 0;
  
  if (resolvedParams.slug === "new-arrivals") {
    categoryName = "New Arrivals";
    // New Arrivals is essentially all products ordered by creation date (default in getAllProducts)
    const [fetchedProducts, count] = await Promise.all([
      getAllProducts({ skip, limit }),
      getProductsCount(),
    ]);
    products = fetchedProducts;
    totalCount = count;
  } else {
    const category = await getCategoryBySlug(resolvedParams.slug);
    if (!category) {
      return notFound();
    }
    categoryName = category.name;
    const [fetchedProducts, count] = await Promise.all([
      getAllProducts({ categorySlug: resolvedParams.slug, skip, limit }),
      getProductsCount({ categorySlug: resolvedParams.slug }),
    ]);
    products = fetchedProducts;
    totalCount = count;
  }

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="flex flex-col items-center text-center mb-12">
        <h1 className="font-heading text-4xl sm:text-5xl font-medium mb-4">{categoryName}</h1>
      </div>

      <div className="flex justify-between items-center py-4 border-y border-border mb-8">
        <Button variant="ghost" className="text-sm font-medium gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          Filter
        </Button>
        <div className="text-sm text-muted-foreground hidden sm:block">
          {totalCount} Results
        </div>
        <Button variant="ghost" className="text-sm font-medium gap-2">
          Sort by: Recommended
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>

      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-10">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination totalPages={totalPages} currentPage={page} />
        </>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          No products found in this category.
        </div>
      )}
    </div>
  );
}
