import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CATALOG_REVALIDATE_SECONDS, CATALOG_TAG } from "@/lib/cache";
import { compareSizes } from "@/lib/catalog-config";
import { PRICE_RANGES, type CatalogFilters, type SortKey } from "@/lib/catalog-filters";
import { dropWindowStart, nextDropTime } from "@/lib/drop";

// Cached, read-only queries for the public storefront. Results are shared by
// every visitor and only re-queried when an admin edits the catalog, a purchase
// changes stock, or the hourly safety revalidation runs. Admin pages keep
// using the uncached functions in ./products and ./categories.

// The cache outlives deployments. When a cached query's result shape changes, bump the
// version suffix in its key (e.g. "-v2") so entries saved in the old shape are not reused.
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

/** Products that have gone live: no release time (added before drops existed), or one that has passed. */
function liveNow(now: Date): Prisma.ProductWhereInput {
  return { OR: [{ releaseAt: null }, { releaseAt: { lte: now } }] };
}

/** Products currently in the Daily Drop section (they leave it, and join New Arrivals, after 24 hours). */
function inDropWindow(now: Date): Prisma.ProductWhereInput {
  return { isDrop: true, releaseAt: { gt: dropWindowStart(now), lte: now } };
}

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

  // Several price ranges mean "any of these"; each of the groups below must also hold.
  const all: Prisma.ProductWhereInput[] = [];
  const ranges = PRICE_RANGES.filter((r) => filters.price.includes(r.id));
  if (ranges.length) {
    all.push({ OR: ranges.map((r) => ({ price: { gte: r.min, ...(r.max !== undefined ? { lt: r.max } : {}) } })) });
  }
  if (filters.instock.length) {
    all.push({ OR: [{ hasVariants: false, stock: { gt: 0 } }, { hasVariants: true, variants: { some: { stock: { gt: 0 } } } }] });
  }
  if (all.length) where.AND = all;
  return where;
}

// Newest means most recently released; products added before release times existed come after them, by date added.
const newestFirst: Prisma.ProductOrderByWithRelationInput[] = [
  { releaseAt: { sort: "desc", nulls: "last" } },
  { createdAt: "desc" },
];

function orderFor(sort: SortKey | undefined): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ price: "asc" }, ...newestFirst];
    case "price-desc":
      return [{ price: "desc" }, ...newestFirst];
    case "best-sellers":
      return [{ isBestSeller: "desc" }, ...newestFirst];
    default:
      return newestFirst;
  }
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
    const now = new Date();
    // Pieces in today's drop are shown in their own section, so New Arrivals and Trending leave them out.
    const notInDrop: Prisma.ProductWhereInput = { NOT: { isDrop: true, releaseAt: { gt: dropWindowStart(now) } } };
    const [dropRows, dropEverUsed, upcomingDrop, newArrivals, trending, categories, settingsRows] = await Promise.all([
      prisma.product.findMany({
        where: inDropWindow(now),
        select: { ...productCardSelect, releaseAt: true },
        orderBy: { releaseAt: "desc" },
        take: 16,
      }),
      prisma.product.findFirst({ where: { isDrop: true }, select: { id: true } }),
      prisma.product.findFirst({
        where: { isDrop: true, releaseAt: { gt: now } },
        orderBy: { releaseAt: "asc" },
        select: { releaseAt: true },
      }),
      prisma.product.findMany({
        where: { AND: [liveNow(now), notInDrop] },
        select: productCardSelect,
        orderBy: newestFirst,
        take: 8,
      }),
      prisma.product.findMany({
        where: { AND: [liveNow(now), notInDrop, { isBestSeller: true }] },
        select: productCardSelect,
        orderBy: newestFirst,
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

    // The countdown aims at the earlier of the next daily slot and any piece scheduled sooner.
    const slot = nextDropTime(now);
    const nextDropAt = upcomingDrop?.releaseAt && upcomingDrop.releaseAt < slot ? upcomingDrop.releaseAt : slot;
    const drop = {
      // Dates are not kept through the cache, so they are stored as ISO strings.
      products: dropRows.map((p) => ({ ...p, releaseAt: (p.releaseAt as Date).toISOString() })),
      // Only tease the next drop once the store has actually used the feature.
      enabled: dropEverUsed !== null,
      nextDropAt: nextDropAt.toISOString(),
    };
    return { drop, newArrivals, trending, categories, settings };
  },
  ["home-page-data-v3"],
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
  async (page: number, categorySlug: string | null, filters?: CatalogFilters, sort?: SortKey) => {
    const where: Prisma.ProductWhereInput = {
      AND: [liveNow(new Date()), inCategory(categorySlug), matchesFilters(filters)],
    };
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: productCardSelect,
        orderBy: orderFor(sort),
        skip: (page - 1) * PRODUCTS_PER_PAGE,
        take: PRODUCTS_PER_PAGE,
      }),
      prisma.product.count({ where }),
    ]);
    return { products, total, totalPages: Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE)) };
  },
  ["catalog-product-page-v4"],
  cacheOptions
);

export type CatalogFacets = {
  size: string[];
  color: string[];
  material: string[];
  shape: string[];
  finish: string[];
  /** Price range ids and the in-stock switch are offered whenever the section has products. */
  price: string[];
  instock: string[];
};

/** Every value a shopper can filter by in a department or category (or the whole shop). */
export const getCatalogFacets = unstable_cache(
  async (categorySlug: string | null): Promise<CatalogFacets> => {
    const base: Prisma.ProductWhereInput = { AND: [liveNow(new Date()), inCategory(categorySlug)] };
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

    const hasProducts = rows.length > 0;
    return {
      color,
      material,
      shape,
      finish,
      size: sizeRows.map((r) => r.size).sort(compareSizes),
      price: hasProducts ? PRICE_RANGES.map((r) => r.id) : [],
      instock: hasProducts ? ["1"] : [],
    };
  },
  ["catalog-facets-v3"],
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
        releaseAt: true,
        category: { select: { name: true, slug: true, type: true, parent: { select: { name: true, slug: true } } } },
        variants: { select: { id: true, size: true, stock: true } },
      },
    });
    if (!product) return null;

    const related = await prisma.product.findMany({
      where: { AND: [{ categoryId: product.categoryId, id: { not: product.id } }, liveNow(new Date())] },
      select: productCardSelect,
      orderBy: newestFirst,
      take: 4,
    });
    // The release time travels as an ISO string (dates do not survive the cache); the page hides unreleased products.
    return { product: { ...product, releaseAt: product.releaseAt ? product.releaseAt.toISOString() : null }, related };
  },
  ["catalog-product-detail-v3"],
  cacheOptions
);

/** Parses a ?page= value into a safe positive integer. */
export function parsePage(value: string | string[] | undefined): number {
  const n = parseInt(Array.isArray(value) ? value[0] : value ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 1000) : 1;
}
