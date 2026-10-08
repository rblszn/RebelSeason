import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView, type CatalogCrumb, type CatalogPill } from "@/components/store/CatalogView";
import {
  getCatalogFacets,
  getCategoryPageInfo,
  getProductPage,
  parsePage,
} from "@/lib/dal/catalog";
import { isProductType, type ProductType } from "@/lib/catalog-config";
import { parseFilters } from "@/lib/catalog-filters";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: Pick<CategoryPageProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "new-arrivals") return { title: "New Arrivals" };
  const category = await getCategoryPageInfo(slug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description: category.description?.slice(0, 160) || `Shop ${category.name} at The Rebel Season.`,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const page = parsePage(resolvedSearchParams.page);
  const filters = parseFilters(resolvedSearchParams);

  let title: string;
  let description: string | null = null;
  let categorySlug: string | null;
  let breadcrumb: CatalogCrumb[];
  let pills: CatalogPill[] = [];
  let type: ProductType | undefined;

  if (resolvedParams.slug === "new-arrivals") {
    // New Arrivals is all products, newest first.
    title = "New Arrivals";
    categorySlug = null;
    breadcrumb = [{ label: "Home", href: "/" }, { label: title }];
  } else {
    const category = await getCategoryPageInfo(resolvedParams.slug);
    if (!category) {
      return notFound();
    }
    title = category.name;
    description = category.description;
    categorySlug = category.slug;
    type = asType(category.type);

    if (category.parent) {
      // A category such as Tops: show its sibling categories, with this one highlighted.
      breadcrumb = [
        { label: "Home", href: "/" },
        { label: category.parent.name, href: `/categories/${category.parent.slug}` },
        { label: category.name },
      ];
      pills = [
        { label: "All", href: `/categories/${category.parent.slug}` },
        ...category.parent.children.map((c) => ({
          label: c.name,
          href: `/categories/${c.slug}`,
          active: c.slug === category.slug,
        })),
      ];
    } else {
      // A department such as Clothing: link to each of its categories.
      breadcrumb = [{ label: "Home", href: "/" }, { label: category.name }];
      pills = category.children.map((c) => ({ label: c.name, href: `/categories/${c.slug}` }));
    }
  }

  const basePath = `/categories/${resolvedParams.slug}`;
  const [{ products, total, totalPages }, facets] = await Promise.all([
    getProductPage(page, categorySlug, filters),
    getCatalogFacets(categorySlug),
  ]);

  return (
    <CatalogView
      title={title}
      description={description}
      breadcrumb={breadcrumb}
      pills={pills}
      basePath={basePath}
      type={type}
      products={products}
      total={total}
      totalPages={totalPages}
      page={page}
      facets={facets}
      filters={filters}
    />
  );
}

function asType(value: string | undefined): ProductType | undefined {
  return value && isProductType(value) ? value : undefined;
}
