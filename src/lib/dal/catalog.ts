import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CATALOG_REVALIDATE_SECONDS, CATALOG_TAG } from "@/lib/cache";

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
  variants: { select: { stock: true } },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

export const PRODUCTS_PER_PAGE = 12;

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
        select: { id: true, name: true, slug: true, image: true },
        orderBy: { name: "asc" },
      }),
      prisma.setting.findMany(),
    ]);
    const settings = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]));
    return { newArrivals, trending, categories, settings };
  },
  ["home-page-data"],
  cacheOptions
);

export const getCatalogCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      select: { id: true, name: true, slug: true, image: true },
      orderBy: { name: "asc" },
    }),
  ["catalog-categories"],
  cacheOptions
);

export const getCategoryNameBySlug = unstable_cache(
  async (slug: string) =>
    prisma.category.findUnique({ where: { slug }, select: { id: true, name: true } }),
  ["catalog-category-by-slug"],
  cacheOptions
);

export const getProductPage = unstable_cache(
  async (page: number, categorySlug: string | null) => {
    const where: Prisma.ProductWhereInput = categorySlug ? { category: { slug: categorySlug } } : {};
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
        careInstructions: true,
        hasVariants: true,
        stock: true,
        categoryId: true,
        category: { select: { name: true, slug: true } },
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
