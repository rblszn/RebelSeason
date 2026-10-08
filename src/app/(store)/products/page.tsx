import { CatalogView } from "@/components/store/CatalogView";
import { getCatalogCategories, getCatalogFacets, getProductPage, parsePage } from "@/lib/dal/catalog";
import { parseFilters } from "@/lib/catalog-filters";

export const metadata = { title: "Shop All" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const page = parsePage(resolvedParams.page);
  const filters = parseFilters(resolvedParams);

  const [{ products, total, totalPages }, facets, departments] = await Promise.all([
    getProductPage(page, null, filters),
    getCatalogFacets(null),
    getCatalogCategories(),
  ]);

  return (
    <CatalogView
      title="Shop All"
      description="Clothing, bags, jewellery and nail extensions. Pick a department to narrow it down."
      breadcrumb={[{ label: "Home", href: "/" }, { label: "Shop" }]}
      pills={departments.map((d) => ({ label: d.name, href: `/categories/${d.slug}` }))}
      basePath="/products"
      products={products}
      total={total}
      totalPages={totalPages}
      page={page}
      facets={facets}
      filters={filters}
    />
  );
}
