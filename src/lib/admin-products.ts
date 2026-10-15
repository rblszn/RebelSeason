import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  isProductType,
  normalizeAttribute,
  unusedAttributeKeys,
  validateProductAttributes,
} from "@/lib/catalog-config";
import { resolveRelease } from "@/lib/drop";

const attribute = z.string().max(120).nullish();

export const productInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers and hyphens"),
  categoryId: z.string().min(1),
  price: z.number().int().min(1),
  originalPrice: z.number().int().min(0).nullish(),
  description: z.string().max(10000).nullish(),
  shortDescription: z.string().max(500).nullish(),
  images: z.array(z.string().url()).max(20).default([]),
  isNew: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  hasVariants: z.boolean().default(false),
  stock: z.number().int().min(0).default(0),
  material: attribute,
  color: attribute,
  shape: attribute,
  finish: attribute,
  dimensions: attribute,
  careInstructions: z.string().max(1000).nullish(),
  /** When the product goes live: keep the stored time, the next daily drop, right now, or a custom time. */
  releaseMode: z.enum(["keep", "next-drop", "now", "custom"]).optional(),
  /** ISO time for releaseMode "custom". */
  releaseAt: z.string().max(40).nullish(),
  /** Feature the product in the homepage Daily Drop for 24 hours after it goes live. */
  isDrop: z.boolean().optional(),
  features: z.array(z.string().max(200)).max(50).optional(),
  variants: z
    .array(z.object({ size: z.string().trim().min(1).max(20), stock: z.number().int().min(0) }))
    .max(40)
    .default([]),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export type CategoryCheck = { ok: true; type: string } | { ok: false; error: string };

/**
 * Checks the product against the department of its category: the category must
 * be one products can sit in, and the product must provide that department's
 * attributes (size, colour, fabric ...).
 */
export async function checkProductCategory(input: ProductInput): Promise<CategoryCheck> {
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { type: true, _count: { select: { children: true } } },
  });
  if (!category || !isProductType(category.type)) return { ok: false, error: "Selected category does not exist" };
  if (category._count.children > 0) {
    return { ok: false, error: "Pick a specific category (for example Tops or Dresses), not the whole department" };
  }
  const problem = validateProductAttributes(category.type, input);
  return problem ? { ok: false, error: problem } : { ok: true, type: category.type };
}

/** The prisma data for a product row, with attributes cleaned and the stock total derived from sizes. */
export function productData(input: ProductInput, type: string) {
  // Release settings are resolved separately (see releaseData), not stored as sent.
  const { variants, originalPrice, releaseMode, releaseAt, isDrop, ...rest } = input;
  void releaseMode;
  void releaseAt;
  void isDrop;
  const attributes = {
    material: normalizeAttribute(input.material),
    color: normalizeAttribute(input.color),
    shape: normalizeAttribute(input.shape),
    finish: normalizeAttribute(input.finish),
    dimensions: input.dimensions?.replace(/\s+/g, " ").trim() || null,
  };
  // Attributes that do not belong to this department are dropped, so changing a
  // product's category never leaves stale values behind.
  if (isProductType(type)) {
    for (const key of unusedAttributeKeys(type)) attributes[key] = null;
  }
  return {
    ...rest,
    ...attributes,
    stock: input.hasVariants ? variants.reduce((sum, v) => sum + v.stock, 0) : input.stock,
    originalPrice: originalPrice || null,
    discount:
      originalPrice && originalPrice > input.price
        ? Math.round(((originalPrice - input.price) / originalPrice) * 100)
        : null,
  };
}

export type ReleaseData =
  | { ok: true; data: { releaseAt?: Date; isDrop?: boolean } }
  | { ok: false; error: string };

/**
 * The release time and Daily Drop flag to store. A new product defaults to
 * going live right away as a regular listing; an edit defaults to leaving the
 * stored release time alone. `existingReleaseAt` is the stored time on an edit.
 */
export function releaseData(input: ProductInput, creating: boolean, existingReleaseAt?: Date | null): ReleaseData {
  const mode = input.releaseMode ?? (creating ? "now" : "keep");
  const resolved = resolveRelease(mode, input.releaseAt);
  if ("error" in resolved) return { ok: false, error: resolved.error };

  const data: { releaseAt?: Date; isDrop?: boolean } = {};
  if (resolved.releaseAt) data.releaseAt = resolved.releaseAt;
  if (input.isDrop !== undefined) data.isDrop = input.isDrop;
  else if (creating) data.isDrop = false;

  // A product with no release time (added before drops existed) cannot be in the drop unless it gets one.
  if (data.releaseAt === undefined && !creating && !existingReleaseAt) data.isDrop = false;
  return { ok: true, data };
}

/**
 * Brings a product's variants in line with `sizes` without deleting rows that
 * existing order items reference: matching sizes are updated in place, new
 * sizes are created, and removed sizes are deleted (order items keep their
 * snapshot of the size name; the FK is set to null).
 */
export async function syncVariants(
  tx: Prisma.TransactionClient,
  productId: string,
  hasVariants: boolean,
  sizes: ProductInput["variants"]
) {
  const existing = await tx.productVariant.findMany({ where: { productId }, select: { id: true, size: true } });
  const wanted = hasVariants ? sizes : [];
  const wantedBySize = new Map(wanted.map((v) => [v.size, v.stock]));

  const toDelete = existing.filter((v) => !wantedBySize.has(v.size)).map((v) => v.id);
  if (toDelete.length) {
    await tx.productVariant.deleteMany({ where: { id: { in: toDelete } } });
  }

  for (const variant of existing) {
    const stock = wantedBySize.get(variant.size);
    if (stock !== undefined) {
      await tx.productVariant.update({ where: { id: variant.id }, data: { stock } });
    }
  }

  const existingSizes = new Set(existing.map((v) => v.size));
  const toCreate = wanted.filter((v) => !existingSizes.has(v.size));
  if (toCreate.length) {
    await tx.productVariant.createMany({ data: toCreate.map((v) => ({ productId, size: v.size, stock: v.stock })) });
  }
}

export function prismaErrorResponse(error: unknown): { status: number; error: string } | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { status: 409, error: "A product with this slug already exists" };
    if (error.code === "P2003") return { status: 400, error: "Selected category does not exist" };
    if (error.code === "P2025") return { status: 404, error: "Product not found" };
  }
  return null;
}
