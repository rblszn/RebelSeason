import { z } from "zod";
import { prisma } from "@/lib/db";
import { PRODUCT_TYPES, type ProductType } from "@/lib/catalog-config";

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers and hyphens"),
  description: z.string().max(1000).nullish(),
  image: z.string().max(1000).nullish(),
  /** Empty / null = a top-level department. */
  parentId: z.string().nullish(),
  /** Only used for departments; categories inherit the type of their department. */
  type: z.enum(PRODUCT_TYPES).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export type CategoryWrite =
  | {
      ok: true;
      data: {
        name: string;
        slug: string;
        description: string | null;
        image: string | null;
        parentId: string | null;
        type: ProductType;
        sortOrder?: number;
      };
    }
  | { ok: false; status: number; error: string };

/**
 * Applies the department rules: two levels only, a category takes the type of
 * its department, and a department that has categories cannot be moved under
 * another one. `selfId` is set when editing an existing category.
 */
export async function resolveCategoryWrite(input: CategoryInput, selfId?: string): Promise<CategoryWrite> {
  const parentId = input.parentId || null;
  let type: ProductType = input.type ?? "CLOTHING";

  if (parentId) {
    if (parentId === selfId) return { ok: false, status: 400, error: "A category cannot be its own parent" };
    const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { parentId: true, type: true } });
    if (!parent) return { ok: false, status: 400, error: "Parent department does not exist" };
    if (parent.parentId) {
      return { ok: false, status: 400, error: "Categories can only be placed directly under a department" };
    }
    type = parent.type;
    if (selfId) {
      const children = await prisma.category.count({ where: { parentId: selfId } });
      if (children > 0) {
        return {
          ok: false,
          status: 400,
          error: "This department has categories under it, so it cannot become a category itself",
        };
      }
    }
  }

  return {
    ok: true,
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description?.trim() || null,
      image: input.image || null,
      parentId,
      type,
      sortOrder: input.sortOrder,
    },
  };
}
