import { Prisma, type StockReason } from "@prisma/client";
import { prisma, type Db, type Tx } from "@/lib/db";
import { badRequest, conflict, notFound } from "@/lib/api";
import { istRange } from "@/lib/ist";
import { resolveUnits } from "@/lib/pos/units";

/**
 * One shared stock for the shop and the website. Every change goes through applyStockDeltas,
 * which updates the stock and writes the history row in the same statement, and never lets
 * stock go below zero. A "unit" is a size (variant) or a product without sizes.
 */

export type StockLine = { variantId?: string; productId?: string; delta: number };

export type StockMeta = {
  reason: StockReason;
  orderId?: string | null;
  userId?: string | null;
  note?: string | null;
};

export type StockResult = {
  changed: number;
  expected: number;
  /** Lines that could not be applied because they would have taken stock below zero. */
  failed: StockLine[];
};

function sumBy(lines: StockLine[], key: "variantId" | "productId") {
  const sums = new Map<string, number>();
  for (const l of lines) {
    const id = l[key];
    if (id) sums.set(id, (sums.get(id) ?? 0) + l.delta);
  }
  for (const [id, delta] of sums) if (delta === 0) sums.delete(id);
  return sums;
}

/**
 * Apply stock changes and write the matching StockMovement rows. A unit is only changed when
 * the result stays at or above zero, so two simultaneous sales can never oversell the last piece.
 * Callers that need all-or-nothing compare `changed` with `expected` and roll back.
 */
export async function applyStockDeltas(db: Db, lines: StockLine[], meta: StockMeta): Promise<StockResult> {
  const variants = sumBy(lines, "variantId");
  const products = sumBy(lines, "productId");
  const expected = variants.size + products.size;
  if (!expected) return { changed: 0, expected: 0, failed: [] };

  const applied = new Set<string>();

  if (variants.size) {
    const rows = [...variants].map(([id, delta]) => Prisma.sql`(${id}, ${delta}::int)`);
    const done = await db.$queryRaw<{ id: string }[]>`
      WITH x(id, delta) AS (VALUES ${Prisma.join(rows)}),
      upd AS (
        UPDATE "product_variants" AS v
        SET stock = v.stock + x.delta
        FROM x
        WHERE v.id = x.id AND v.stock + x.delta >= 0
        RETURNING v.id, v.barcode, v.size, v.stock, v."productId", x.delta
      )
      INSERT INTO "stock_movements" ("id", "variantId", "productId", "barcode", "productName", "variantName", "delta", "stockAfter", "reason", "orderId", "userId", "note", "createdAt")
      SELECT gen_random_uuid()::text, upd.id, upd."productId", upd.barcode, p.name, upd.size, upd.delta, upd.stock,
             ${meta.reason}::"StockReason", ${meta.orderId ?? null}, ${meta.userId ?? null}, ${meta.note ?? null}, NOW()
      FROM upd JOIN "products" p ON p.id = upd."productId"
      RETURNING "variantId" AS id`;
    for (const r of done) applied.add(`v:${r.id}`);
  }

  if (products.size) {
    const rows = [...products].map(([id, delta]) => Prisma.sql`(${id}, ${delta}::int)`);
    const done = await db.$queryRaw<{ id: string }[]>`
      WITH x(id, delta) AS (VALUES ${Prisma.join(rows)}),
      upd AS (
        UPDATE "products" AS p
        SET stock = p.stock + x.delta, "updatedAt" = NOW()
        FROM x
        WHERE p.id = x.id AND p."hasVariants" = false AND p.stock + x.delta >= 0
        RETURNING p.id, p.barcode, p.name, p.stock, x.delta
      )
      INSERT INTO "stock_movements" ("id", "variantId", "productId", "barcode", "productName", "variantName", "delta", "stockAfter", "reason", "orderId", "userId", "note", "createdAt")
      SELECT gen_random_uuid()::text, NULL, upd.id, upd.barcode, upd.name, NULL, upd.delta, upd.stock,
             ${meta.reason}::"StockReason", ${meta.orderId ?? null}, ${meta.userId ?? null}, ${meta.note ?? null}, NOW()
      FROM upd
      RETURNING "productId" AS id`;
    for (const r of done) applied.add(`p:${r.id}`);
  }

  const failed: StockLine[] = [
    ...[...variants].filter(([id]) => !applied.has(`v:${id}`)).map(([variantId, delta]) => ({ variantId, delta })),
    ...[...products].filter(([id]) => !applied.has(`p:${id}`)).map(([productId, delta]) => ({ productId, delta })),
  ];
  return { changed: applied.size, expected, failed };
}

/** Stock lines for an order's items (a size, or the product when it has none). Items whose product was deleted are skipped. */
async function linesForOrder(db: Db, orderId: string, sign: 1 | -1) {
  const items = await db.orderItem.findMany({ where: { orderId }, select: { variantId: true, productId: true, quantity: true } });
  const lines: StockLine[] = [];
  for (const i of items) {
    if (i.variantId) lines.push({ variantId: i.variantId, delta: sign * i.quantity });
    else if (i.productId) lines.push({ productId: i.productId, delta: sign * i.quantity });
  }
  return { lines, itemCount: items.length };
}

/**
 * Take stock for every item of an order, all or nothing: if any line can't be fulfilled this
 * throws a 409 and the caller's transaction rolls back. Must run inside a transaction.
 */
export async function commitStockForOrder(tx: Tx, orderId: string, meta: Omit<StockMeta, "orderId">) {
  const { lines, itemCount } = await linesForOrder(tx, orderId, -1);
  if (lines.length !== itemCount) throw conflict("An item on this bill is no longer available", "STOCK_CONFLICT");
  const result = await applyStockDeltas(tx, lines, { ...meta, orderId });
  if (result.changed !== result.expected) throw conflict("Not enough stock for one or more items", "STOCK_CONFLICT");
}

/** Put stock back for a cancelled order. */
export async function restoreStockForOrder(db: Db, orderId: string, meta: Omit<StockMeta, "orderId" | "reason"> = {}) {
  const { lines } = await linesForOrder(db, orderId, 1);
  await applyStockDeltas(db, lines, { ...meta, reason: "CANCEL", orderId });
}

// ---------------------------------------------------------------------------
// Shop-side tools
// ---------------------------------------------------------------------------

async function unitsForBarcodes(db: Db, codes: string[]) {
  const units = await resolveUnits(db, codes);
  const missing = codes.find((c) => !units.has(c.trim()));
  if (missing) throw badRequest(`No product has the code "${missing}". Remove it and try again.`);
  return units;
}

function lineFor(unit: { kind: "variant" | "product"; id: string }, delta: number): StockLine {
  return unit.kind === "variant" ? { variantId: unit.id, delta } : { productId: unit.id, delta };
}

/** New stock arrived: add it (shop and website) and record who received it. */
export async function receiveStock(userId: string, lines: { barcode: string; quantity: number }[], note?: string | null) {
  const units = await unitsForBarcodes(prisma, lines.map((l) => l.barcode));
  await prisma.$transaction(async (tx) => {
    const result = await applyStockDeltas(
      tx,
      lines.map((l) => lineFor(units.get(l.barcode.trim())!, l.quantity)),
      { reason: "RECEIVED", userId, note: note || null }
    );
    if (result.changed !== result.expected) throw conflict("Stock couldn't be updated. Please try again.");
  }, { maxWait: 10_000, timeout: 30_000 });
  return { pieces: lines.reduce((s, l) => s + l.quantity, 0) };
}

/** Manual correction (damaged, gift, sample, lost, found ...). Can't take stock below zero. */
export async function adjustStock(userId: string, input: { barcode: string; delta: number; reason: string; note?: string | null }) {
  const units = await unitsForBarcodes(prisma, [input.barcode]);
  const unit = units.get(input.barcode.trim())!;
  if (unit.stock + input.delta < 0) throw badRequest(`Only ${unit.stock} in stock, so you can remove at most ${unit.stock}`);
  await prisma.$transaction(async (tx) => {
    const note = [input.reason, input.note].filter(Boolean).join(": ");
    const result = await applyStockDeltas(tx, [lineFor(unit, input.delta)], { reason: "ADJUSTMENT", userId, note });
    if (result.changed !== 1) throw conflict("Stock changed while you were editing. Please refresh and try again.");
  }, { maxWait: 10_000, timeout: 30_000 });
}

// ---------------------------------------------------------------------------
// Edits made in the admin product form
// ---------------------------------------------------------------------------

export type StockSnapshot = { key: string; variantId: string | null; productId: string; barcode: string; productName: string; variantName: string | null; stock: number }[];

/** Stock by unit for a product, taken before and after an admin edit. */
export async function snapshotProductStock(db: Db, productId: string): Promise<StockSnapshot> {
  const p = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, barcode: true, stock: true, hasVariants: true, variants: { select: { id: true, size: true, barcode: true, stock: true } } },
  });
  if (!p) return [];
  if (p.hasVariants) {
    return p.variants.map((v) => ({ key: `v:${v.id}`, variantId: v.id, productId: p.id, barcode: v.barcode, productName: p.name, variantName: v.size, stock: v.stock }));
  }
  return [{ key: `p:${p.id}`, variantId: null, productId: p.id, barcode: p.barcode, productName: p.name, variantName: null, stock: p.stock }];
}

/**
 * Record, in the stock history, what an admin edit changed. The edit already changed the
 * stock; this only writes the history rows so the shop can see who did it.
 */
export async function logStockEdit(db: Db, userId: string | null, before: StockSnapshot, after: StockSnapshot, created: boolean) {
  const beforeByKey = new Map(before.map((u) => [u.key, u]));
  const afterKeys = new Set(after.map((u) => u.key));
  const rows: Prisma.StockMovementCreateManyInput[] = [];

  for (const unit of after) {
    const old = beforeByKey.get(unit.key);
    const delta = unit.stock - (old?.stock ?? 0);
    if (delta === 0) continue;
    rows.push({
      variantId: unit.variantId,
      productId: unit.productId,
      barcode: unit.barcode,
      productName: unit.productName,
      variantName: unit.variantName,
      delta,
      stockAfter: unit.stock,
      reason: created || !old ? "INITIAL" : "ADJUSTMENT",
      userId,
      note: created || !old ? "Added in the admin panel" : "Edited in the admin panel",
    });
  }
  for (const old of before) {
    if (afterKeys.has(old.key) || old.stock === 0) continue;
    rows.push({
      variantId: null,
      productId: old.productId,
      barcode: old.barcode,
      productName: old.productName,
      variantName: old.variantName,
      delta: -old.stock,
      stockAfter: 0,
      reason: "ADJUSTMENT",
      userId,
      note: "Removed in the admin panel",
    });
  }
  if (rows.length) await db.stockMovement.createMany({ data: rows });
}

// ---------------------------------------------------------------------------
// Stock history (admin)
// ---------------------------------------------------------------------------

export const STOCK_REASON_LABELS: Record<StockReason, string> = {
  INITIAL: "Opening stock",
  ONLINE_SALE: "Online sale",
  POS_SALE: "Shop sale",
  RECEIVED: "Stock received",
  ADJUSTMENT: "Adjustment",
  CANCEL: "Cancelled order",
};

export async function listStockMovements(params: { q?: string; reason?: StockReason; from?: string; to?: string; page?: number; pageSize?: number }) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;
  const q = params.q?.trim();
  const range = params.from ? istRange(params.from, params.to ?? params.from) : null;
  const where: Prisma.StockMovementWhereInput = {
    ...(params.reason ? { reason: params.reason } : {}),
    ...(range ? { createdAt: { gte: range.start, lt: range.end } } : {}),
    ...(q
      ? {
          OR: [
            { productName: { contains: q, mode: "insensitive" } },
            { barcode: q },
            { variantName: { contains: q, mode: "insensitive" } },
            { note: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);
  const orderIds = [...new Set(rows.map((r) => r.orderId).filter((id): id is string => Boolean(id)))];
  const orders = orderIds.length ? await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNumber: true } }) : [];
  const orderNumber = new Map(orders.map((o) => [o.id, o.orderNumber]));
  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    rows: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      productName: r.productName,
      productId: r.productId,
      variantName: r.variantName,
      barcode: r.barcode,
      delta: r.delta,
      stockAfter: r.stockAfter,
      reason: r.reason,
      orderId: r.orderId,
      orderNumber: r.orderId ? (orderNumber.get(r.orderId) ?? null) : null,
      by: r.user ? (r.user.name || r.user.email) : r.reason === "ONLINE_SALE" ? "Website" : null,
      note: r.note,
    })),
  };
}

// ---------------------------------------------------------------------------
// Supplier barcodes (admin product page)
// ---------------------------------------------------------------------------

export async function addSupplierBarcode(productId: string, target: { variantId?: string }, code: string) {
  if (target.variantId) {
    const variant = await prisma.productVariant.findFirst({ where: { id: target.variantId, productId }, select: { id: true } });
    if (!variant) throw notFound("Size not found");
  } else {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { hasVariants: true } });
    if (!product) throw notFound("Product not found");
    if (product.hasVariants) throw badRequest("Choose which size this code belongs to");
  }
  const clash = (await resolveUnits(prisma, [code])).get(code);
  if (clash) throw conflict(`That code already identifies ${clash.name}${clash.size ? ` (${clash.size})` : ""}`);
  return prisma.supplierBarcode.create({ data: { code, variantId: target.variantId ?? null, productId: target.variantId ? null : productId } });
}

export async function removeSupplierBarcode(productId: string, barcodeId: string) {
  const deleted = await prisma.supplierBarcode.deleteMany({
    where: { id: barcodeId, OR: [{ productId }, { variant: { productId } }] },
  });
  if (!deleted.count) throw notFound("Barcode not found");
}
