import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const productInclude = {
  category: true,
  variants: true,
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

export interface GetProductsOptions {
  categorySlug?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  limit?: number;
  skip?: number;
  orderBy?: Prisma.ProductOrderByWithRelationInput;
}

/**
 * Fetch all products with category and variant details.
 */
export async function getAllProducts(
  options?: GetProductsOptions
): Promise<ProductWithRelations[]> {
  const { categorySlug, isFeatured, isNew, isBestSeller, limit, skip, orderBy } =
    options || {};

  return prisma.product.findMany({
    where: {
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      ...(isFeatured !== undefined ? { isFeatured } : {}),
      ...(isNew !== undefined ? { isNew } : {}),
      ...(isBestSeller !== undefined ? { isBestSeller } : {}),
    },
    include: productInclude,
    orderBy: orderBy || { createdAt: "desc" },
    ...(skip !== undefined ? { skip } : {}),
    ...(limit !== undefined ? { take: limit } : {}),
  });
}

/**
 * Fetch a single product by its unique slug.
 */
export async function getProductBySlug(
  slug: string
): Promise<ProductWithRelations | null> {
  return prisma.product.findUnique({
    where: { slug },
    include: productInclude,
  });
}

/**
 * Fetch a single product by its unique ID.
 */
export async function getProductById(
  id: string
): Promise<ProductWithRelations | null> {
  return prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });
}

/**
 * Fetch all products in a given category by category slug.
 */
export async function getProductsByCategory(
  slug: string,
  options?: { limit?: number; skip?: number }
): Promise<ProductWithRelations[]> {
  return prisma.product.findMany({
    where: {
      category: {
        slug,
      },
    },
    include: productInclude,
    orderBy: { createdAt: "desc" },
    ...(options?.skip !== undefined ? { skip: options.skip } : {}),
    ...(options?.limit !== undefined ? { take: options.limit } : {}),
  });
}

/**
 * Fetch featured products.
 */
export async function getFeaturedProducts(
  limit?: number
): Promise<ProductWithRelations[]> {
  return prisma.product.findMany({
    where: { isFeatured: true },
    include: productInclude,
    orderBy: { createdAt: "desc" },
    ...(limit !== undefined ? { take: limit } : {}),
  });
}

/**
 * Fetch new arrival products.
 */
export async function getNewArrivals(
  limit?: number
): Promise<ProductWithRelations[]> {
  return prisma.product.findMany({
    include: productInclude,
    orderBy: { createdAt: "desc" },
    ...(limit !== undefined ? { take: limit } : {}),
  });
}

/**
 * Fetch trending / bestseller products.
 */
export async function getTrendingProducts(
  limit?: number
): Promise<ProductWithRelations[]> {
  return prisma.product.findMany({
    where: { isBestSeller: true },
    include: productInclude,
    orderBy: { createdAt: "desc" },
    ...(limit !== undefined ? { take: limit } : {}),
  });
}
