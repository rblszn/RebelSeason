import { ProductCard } from "@/components/product/ProductCard";
import { notFound } from "next/navigation";
import { getCategoryNameBySlug, getProductPage, parsePage } from "@/lib/dal/catalog";
import { Pagination } from "@/components/ui/Pagination";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const page = parsePage(resolvedSearchParams.page);

  let categoryName: string;
  let categorySlug: string | null;

  if (resolvedParams.slug === "new-arrivals") {
    // New Arrivals is all products, newest first.
    categoryName = "New Arrivals";
    categorySlug = null;
  } else {
    const category = await getCategoryNameBySlug(resolvedParams.slug);
    if (!category) {
      return notFound();
    }
    categoryName = category.name;
    categorySlug = resolvedParams.slug;
  }

  const { products, total: totalCount, totalPages } = await getProductPage(page, categorySlug);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="flex flex-col items-center text-center mb-12">
        <h1 className="font-heading text-4xl sm:text-5xl font-medium mb-4">{categoryName}</h1>
      </div>

      <div className="flex justify-center items-center py-4 border-y border-border mb-8">
        <div className="text-sm text-muted-foreground">
          {totalCount} Results
        </div>
      </div>

      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-10">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i < 4} />
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
