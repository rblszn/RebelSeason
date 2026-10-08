import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CATALOG_REVALIDATE_SECONDS, CATALOG_TAG } from "@/lib/cache";
import { compareSizes } from "@/lib/catalog-config";
import type { CatalogFilters } from "@/lib/catalog-filters";

// Cached, read-only queries for the public storefront. Results are shared by
// every visitor and only re-queried when an admin edits the catalog, a purchase
// changes stock, or the hourly safety revalidation runs. Admin pages keep
// using the uncached functions in ./products and ./categories.

const cacheOptions = { tags: [CATALOG_TAG], revalidate: CATALOG_REVALIDATE_SECONDS };

export const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  originalPrice: true,
  images: true,
  isNew: true,
  stock: true,
  hasVariants: true,
  variants: { select: { size: true, stock: true } },
  category: { select: { type: true } },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

export const PRODUCTS_PER_PAGE = 12;

const categoryOrder = [{ sortOrder: "asc" }, { name: "asc" }] satisfies Prisma.CategoryOrderByWithRelationInput[];

/**
 * Products in a department or a category. A department slug also matches every
 * category under it (Clothing = Tops + Dresses + ...). Null means everything.
 */
function inCategory(categorySlug: string | null): Prisma.ProductWhereInput {
  return categorySlug ? { category: { OR: [{ slug: categorySlug }, { parent: { slug: categorySlug } }] } } : {};
}

function matchesFilters(filters: CatalogFilters | undefined): Prisma.ProductWhereInput {
  if (!filters) return {};
  const where: Prisma.ProductWhereInput = {};
  if (filters.color.length) where.color = { in: filters.color };
  if (filters.material.length) where.material = { in: filters.material };
  if (filters.shape.length) where.shape = { in: filters.shape };
  if (filters.finish.length) where.finish = { in: filters.finish };
  // Sizes are only worth filtering on while a piece is still in stock in that size.
  if (filters.size.length) where.variants = { some: { size: { in: filters.size }, stock: { gt: 0 } } };
  return where;
}

export type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  children: { id: string; name: string; slug: string; image: string | null }[];
};

/** Departments (Clothing, Bags ...) each with the categories under them, in display order. */
export const getCatalogCategories = unstable_cache(
  async (): Promise<StoreCategory[]> =>
    prisma.category.findMany({
      where: { parentId: null },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        children: { select: { id: true, name: true, slug: true, image: true }, orderBy: categoryOrder },
      },
      orderBy: categoryOrder,
    }),
  ["catalog-categories-tree"],
  cacheOptions
);

export const getHomePageData = unstable_cache(
  async () => {
    const [newArrivals, trending, categories, settingsRows] = await Promise.all([
      prisma.product.findMany({ select: productCardSelect, orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.product.findMany({
        where: { isBestSeller: true },
        select: productCardSelect,
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.category.findMany({
        where: { parentId: null },
        select: { id: true, name: true, slug: true, image: true },
        orderBy: categoryOrder,
      }),
      prisma.setting.findMany(),
    ]);
    const settings = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]));
    return { newArrivals, trending, categories, settings };
  },
  ["home-page-data"],
  cacheOptions
);

/** A department or category with what its page needs: its place in the tree and its neighbours. */
export const getCategoryPageInfo = unstable_cache(
  async (slug: string) => {
    const category = await prisma.category.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        type: true,
        parentId: true,
        parent: {
          select: {
            name: true,
            slug: true,
            children: { select: { id: true, name: true, slug: true }, orderBy: categoryOrder },
          },
        },
        children: { select: { id: true, name: true, slug: true, image: true }, orderBy: categoryOrder },
      },
    });
    return category;
  },
  ["catalog-category-page-info"],
  cacheOptions
);

export const getProductPage = unstable_cache(
  async (page: number, categorySlug: string | null, filters?: CatalogFilters) => {
    const where: Prisma.ProductWhereInput = { ...inCategory(categorySlug), ...matchesFilters(filters) };
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: productCardSelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PRODUCTS_PER_PAGE,
        take: PRODUCTS_PER_PAGE,
      }),
      prisma.product.count({ where }),
    ]);
    return { products, total, totalPages: Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE)) };
  },
  ["catalog-product-page"],
  cacheOptions
);

export type CatalogFacets = {
  size: string[];
  color: string[];
  material: string[];
  shape: string[];
  finish: string[];
};

/** Every value a shopper can filter by in a department or category (or the whole shop). */
export const getCatalogFacets = unstable_cache(
  async (categorySlug: string | null): Promise<CatalogFacets> => {
    const base = inCategory(categorySlug);
    const [rows, sizeRows] = await Promise.all([
      prisma.product.findMany({ where: base, select: { color: true, material: true, shape: true, finish: true } }),
      prisma.productVariant.findMany({ where: { product: base }, select: { size: true }, distinct: ["size"] }),
    ]);

    const unique = (values: (string | null)[]) =>
      [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
    const color = unique(rows.map((r) => r.color));
    const material = unique(rows.map((r) => r.material));
    const shape = unique(rows.map((r) => r.shape));
    const finish = unique(rows.map((r) => r.finish));

    return { color, material, shape, finish, size: sizeRows.map((r) => r.size).sort(compareSizes) };
  },
  ["catalog-facets"],
  cacheOptions
);

export const getProductDetail = unstable_cache(
  async (slug: string) => {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        originalPrice: true,
        images: true,
        description: true,
        material: true,
        color: true,
        shape: true,
        finish: true,
        dimensions: true,
        careInstructions: true,
        hasVariants: true,
        stock: true,
        categoryId: true,
        category: { select: { name: true, slug: true, type: true, parent: { select: { name: true, slug: true } } } },
        variants: { select: { id: true, size: true, stock: true } },
      },
    });
    if (!product) return null;

    const related = await prisma.product.findMany({
      where: { categoryId: product.categoryId, id: { not: product.id } },
      select: productCardSelect,
      orderBy: { createdAt: "desc" },
      take: 4,
    });
    return { product, related };
  },
  ["catalog-product-detail"],
  cacheOptions
);

/** Parses a ?page= value into a safe positive integer. */
export function parsePage(value: string | string[] | undefined): number {
  const n = parseInt(Array.isArray(value) ? value[0] : value ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 1000) : 1;
}
