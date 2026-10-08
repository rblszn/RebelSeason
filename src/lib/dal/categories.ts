import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const categoryInclude = {
  _count: {
    select: {
      products: true,
      children: true,
    },
  },
  parent: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.CategoryInclude;

export type CategoryWithRelations = Prisma.CategoryGetPayload<{
  include: typeof categoryInclude;
}>;

/**
 * Fetch every category (departments and the categories under them), departments
 * first in their display order. Callers group them by `parentId`.
 */
export async function getAllCategories(): Promise<CategoryWithRelations[]> {
  return prisma.category.findMany({
    include: categoryInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

/**
 * Fetch a single category by its slug.
 */
export async function getCategoryBySlug(
  slug: string
): Promise<CategoryWithRelations | null> {
  return prisma.category.findUnique({
    where: { slug },
    include: categoryInclude,
  });
}

/**
 * Fetch a single category by its ID.
 */
export async function getCategoryById(
  id: string
): Promise<CategoryWithRelations | null> {
  return prisma.category.findUnique({
    where: { id },
    include: categoryInclude,
  });
}
