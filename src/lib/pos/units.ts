import { prisma, type Db } from "@/lib/db";
import { notFound } from "@/lib/api";
import type { PosUnit } from "@/lib/pos/types";

/**
 * A "unit" is whatever the till scans and sells: one size of a product (a ProductVariant) or,
 * for products without sizes (a bag, a pair of earrings), the product itself. Both carry a
 * barcode from the same database sequence, so a barcode identifies exactly one unit.
 */

export const unitProductSelect = {
  id: true,
  name: true,
  price: true,
  originalPrice: true,
  images: true,
  stock: true,
  hasVariants: true,
  barcode: true,
  variants: { select: { id: true, size: true, stock: true, barcode: true, supplierCodes: { select: { code: true } } }, orderBy: { id: "asc" as const } },
  supplierCodes: { select: { code: true } },
} as const;

type ProductRow = {
  id: string;
  name: string;
  price: number;
  originalPrice: number | null;
  images: string[];
  stock: number;
  hasVariants: boolean;
  barcode: string;
  variants: { id: string; size: string; stock: number; barcode: string; supplierCodes: { code: string }[] }[];
  supplierCodes: { code: string }[];
};

/** The selling price's original price: the MRP when it is higher, otherwise the price itself. */
export function mrpOf(price: number, originalPrice: number | null) {
  return originalPrice && originalPrice > price ? originalPrice : price;
}

export function unitsOf(p: ProductRow): PosUnit[] {
  const base = {
    productId: p.id,
    name: p.name,
    price: p.price,
    mrp: mrpOf(p.price, p.originalPrice),
    imageUrl: p.images[0] ?? null,
  };
  if (p.hasVariants) {
    return p.variants.map((v) => ({
      ...base,
      kind: "variant" as const,
      id: v.id,
      barcode: v.barcode,
      codes: v.supplierCodes.map((c) => c.code),
      size: v.size,
      stock: v.stock,
    }));
  }
  return [{ ...base, kind: "product" as const, id: p.id, barcode: p.barcode, codes: p.supplierCodes.map((c) => c.code), size: null, stock: p.stock }];
}

/** Every unit with its barcodes, for the POS device cache. */
export async function posCatalog(): Promise<PosUnit[]> {
  const products = await prisma.product.findMany({ orderBy: [{ name: "asc" }, { createdAt: "asc" }], select: unitProductSelect });
  return products.flatMap(unitsOf);
}

/**
 * Units behind a list of barcodes (ours or a supplier's), read live from the database.
 * Anything unknown is simply missing from the result; callers decide what that means.
 */
export async function resolveUnits(db: Db, codes: string[]): Promise<Map<string, PosUnit>> {
  const wanted = [...new Set(codes.map((c) => c.trim()).filter(Boolean))];
  if (!wanted.length) return new Map();

  const products = await db.product.findMany({
    where: {
      OR: [
        { barcode: { in: wanted } },
        { supplierCodes: { some: { code: { in: wanted } } } },
        { variants: { some: { OR: [{ barcode: { in: wanted } }, { supplierCodes: { some: { code: { in: wanted } } } }] } } },
      ],
    },
    select: unitProductSelect,
  });

  const out = new Map<string, PosUnit>();
  for (const unit of products.flatMap(unitsOf)) {
    out.set(unit.barcode, unit);
    for (const code of unit.codes) out.set(code, unit);
  }
  return out;
}

/** The unit behind one scanned or typed code, or null. */
export async function findUnit(code: string) {
  const c = code.trim();
  return c ? ((await resolveUnits(prisma, [c])).get(c) ?? null) : null;
}

/** Stock check: the scanned item plus every size of the same product, live from the database. */
export async function stockLookup(code: string) {
  const unit = await findUnit(code);
  if (!unit) throw notFound(`No product has the code "${code.trim()}"`);

  const product = await prisma.product.findUnique({
    where: { id: unit.productId },
    select: {
      ...unitProductSelect,
      releaseAt: true,
      category: { select: { name: true, parent: { select: { name: true } } } },
    },
  });
  if (!product) throw notFound("Product not found");

  const live = !product.releaseAt || product.releaseAt <= new Date();
  return {
    scannedBarcode: unit.barcode,
    product: {
      id: product.id,
      name: product.name,
      category: [product.category.parent?.name, product.category.name].filter(Boolean).join(" › "),
      onWebsite: live,
      imageUrl: product.images[0] ?? null,
    },
    units: unitsOf(product).map((u) => ({ barcode: u.barcode, size: u.size, price: u.price, mrp: u.mrp, stock: u.stock, onWebsite: live && u.stock > 0 })),
  };
}

/** Find units by product name or barcode (ours or a supplier's), for pick-lists. */
export async function searchUnits(query: string, take = 15) {
  const q = query.trim();
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { barcode: q },
        { supplierCodes: { some: { code: q } } },
        { variants: { some: { OR: [{ barcode: q }, { supplierCodes: { some: { code: q } } }] } } },
      ],
    },
    orderBy: { name: "asc" },
    take,
    select: unitProductSelect,
  });
  return products
    .flatMap(unitsOf)
    .slice(0, take * 4)
    .map((u) => ({ barcode: u.barcode, label: u.size ? `${u.name} · Size ${u.size}` : u.name, stock: u.stock }));
}
