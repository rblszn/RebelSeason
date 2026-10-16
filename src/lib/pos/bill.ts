import { Prisma } from "@prisma/client";
import { prisma, type Db } from "@/lib/db";
import { AppError, badRequest, conflict, forbidden, notFound } from "@/lib/api";
import { financialYear, istRange } from "@/lib/ist";
import { atLeast, verifyApproval, type PosStaff } from "@/lib/pos-auth";
import { evaluateCoupon } from "@/lib/checkout";
import { resolveUnits } from "@/lib/pos/units";
import { commitStockForOrder, restoreStockForOrder } from "@/lib/pos/stock";
import { upsertPosCustomer, WALK_IN_NAME } from "@/lib/pos/customer";
import { getOpenRegister } from "@/lib/pos/register";
import { getStoreSettings } from "@/lib/pos/settings";
import type { CreateBillInput, QuoteBillInput } from "@/lib/pos/validations";
import type { BillQuote, BillView, PaymentMethodType, PosUnit } from "@/lib/pos/types";
import { normalizePhone } from "@/lib/phone";

/**
 * Shop bills. A bill is an Order with channel POS and status DELIVERED (handed over at the
 * counter). Prices, discounts, limits and stock are always worked out here on the server;
 * the screen only sends what was scanned, the discounts typed in and the payments taken.
 *
 * Total = subtotal - coupon - counter discounts. All amounts are whole rupees and prices
 * include all taxes (no separate GST on bills).
 */

// A bill is several small writes; allow time for them when the database is far away.
const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

type PricingInput = Pick<QuoteBillInput, "lines" | "billDiscount" | "couponCode"> & { customerPhone?: string | null };

type PricedLine = BillQuote["lines"][number] & { unit: PosUnit };
type PricedBill = Omit<BillQuote, "lines"> & { couponId: string | null; lines: PricedLine[] };

async function priceBill(input: PricingInput, staff: PosStaff, db: Db = prisma): Promise<PricedBill> {
  const units = await resolveUnits(db, input.lines.map((l) => l.barcode));

  const lines: PricedLine[] = input.lines.map((l) => {
    const unit = units.get(l.barcode.trim());
    if (!unit) throw badRequest("An item on this bill no longer exists. Remove it and scan again.", "ITEM_GONE");
    const gross = unit.price * l.quantity;
    const discount = l.discount ?? 0;
    if (discount > gross) throw badRequest(`The discount on ${unit.name} is more than its price`);
    return {
      unit,
      barcode: unit.barcode,
      name: unit.name,
      size: unit.size,
      imageUrl: unit.imageUrl,
      unitPrice: unit.price,
      unitMrp: Math.max(unit.mrp, unit.price),
      quantity: l.quantity,
      discount,
      lineTotal: gross - discount,
      stock: unit.stock,
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const mrpTotal = lines.reduce((s, l) => s + l.unitMrp * l.quantity, 0);
  const mrpSavings = mrpTotal - subtotal;

  let couponId: string | null = null;
  let couponDiscount = 0;
  let couponError: string | null = null;
  if (input.couponCode) {
    const phone = normalizePhone(input.customerPhone);
    const customer = phone ? await db.user.findFirst({ where: { phone, role: "CUSTOMER" }, select: { id: true } }) : null;
    const coupon = await evaluateCoupon(input.couponCode, { subtotal, mrpTotal }, customer?.id ?? null);
    if (coupon.ok) {
      couponId = coupon.couponId;
      couponDiscount = coupon.discount;
    } else {
      couponError = coupon.error;
    }
  }

  const manual = lines.reduce((s, l) => s + l.discount, 0) + (input.billDiscount ?? 0);
  if (couponDiscount + manual > subtotal) throw badRequest("Discounts can't be more than the bill amount");
  const manualPercent = subtotal ? Math.round((manual / subtotal) * 10000) / 100 : 0;

  // The same item on several lines: check the combined quantity against stock.
  const wanted = new Map<string, number>();
  for (const l of lines) wanted.set(l.barcode, (wanted.get(l.barcode) ?? 0) + l.quantity);
  const stockIssues = [...wanted].flatMap(([barcode, qty]) => {
    const u = lines.find((l) => l.barcode === barcode)!.unit;
    if (qty <= u.stock) return [];
    const label = [u.name, u.size && `Size ${u.size}`].filter(Boolean).join(" · ");
    return [u.stock <= 0 ? `${label} is out of stock` : `Only ${u.stock} left of ${label}`];
  });

  return {
    couponId,
    lines,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    subtotal,
    mrpSavings,
    couponCode: couponId ? input.couponCode!.toUpperCase() : null,
    couponDiscount,
    couponError,
    manualDiscount: manual,
    manualPercent,
    maxDiscountPercent: staff.maxDiscountPercent,
    needsApproval: manualPercent > staff.maxDiscountPercent,
    total: subtotal - couponDiscount - manual,
    stockIssues,
  };
}

/** Price a bill for the screen (coupon check, discount limit, stock warnings). */
export async function quoteBill(staff: PosStaff, input: QuoteBillInput): Promise<BillQuote> {
  const priced = await priceBill({ ...input, customerPhone: input.customer?.phone ?? null }, staff);
  // Drop what only bill creation needs (the coupon id and the full unit records).
  const { couponId: _couponId, lines, ...quote } = priced; // eslint-disable-line @typescript-eslint/no-unused-vars
  return {
    ...quote,
    lines: lines.map(({ unit: _unit, ...line }) => line), // eslint-disable-line @typescript-eslint/no-unused-vars
  };
}

/** "RSS/26-27/00042": gap-free per series, numbered inside the bill's transaction. */
async function nextBillNumber(db: Db, prefix: string) {
  const series = `${prefix}/${financialYear()}`;
  const [row] = await db.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO "invoice_counters" ("series", "lastNumber") VALUES (${series}, 1)
    ON CONFLICT ("series") DO UPDATE SET "lastNumber" = "invoice_counters"."lastNumber" + 1
    RETURNING "lastNumber"`;
  return `${series}/${String(row.lastNumber).padStart(5, "0")}`;
}

/**
 * Create a paid shop bill: customer, bill number, order + items + payments and the stock
 * decrement (shared with the website) all in one transaction. Idempotent per key, so a
 * double-tap or a retry after a network blip never makes two bills.
 */
export async function createBill(session: { staff: PosStaff }, input: CreateBillInput) {
  const { staff } = session;
  // Independent reads in parallel (each is a round trip to the database). A manager's approval
  // PIN is checked outside the transaction so failed attempts are recorded even if the bill fails.
  const [existing, register, settings, approver] = await Promise.all([
    prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: { id: true, orderNumber: true, channel: true } }),
    getOpenRegister(),
    getStoreSettings(),
    input.approval ? verifyApproval(input.approval) : Promise.resolve(null),
  ]);
  if (existing) {
    if (existing.channel !== "POS") throw conflict("Please start a new bill");
    return { id: existing.id, billNumber: existing.orderNumber, emailTo: null };
  }
  if (!register) throw conflict("Open the day (enter the opening cash) before billing", "REGISTER_CLOSED");

  // Price and check everything first, outside the transaction, so the transaction only has to write
  // (the database may be a network hop away, and a transaction has a time limit). Stock can't be
  // oversold by this: taking stock below is one atomic step that refuses to go under zero.
  const quote = await priceBill({ ...input, customerPhone: input.customer.phone }, staff);
  if (quote.couponError) throw badRequest(quote.couponError, "COUPON_INVALID");
  if (quote.stockIssues.length) throw conflict(quote.stockIssues.join(". "), "STOCK_CONFLICT");
  if (quote.needsApproval && !approver) {
    throw new AppError(403, `This discount (${quote.manualPercent}%) is above your limit of ${staff.maxDiscountPercent}%. A manager needs to approve it.`, "APPROVAL_REQUIRED");
  }
  if (quote.needsApproval && approver && quote.manualPercent > approver.maxDiscountPercent) {
    throw forbidden(`${approver.name} can approve up to ${approver.maxDiscountPercent}%. Ask someone with a higher limit.`);
  }
  if (quote.total <= 0) throw badRequest("The bill total is zero. Remove the discount or the items.");

  const paid = input.payments.reduce((s, p) => s + p.amount, 0);
  if (paid !== quote.total) {
    throw badRequest(`Payments add up to ₹${paid.toLocaleString("en-IN")} but the bill is ₹${quote.total.toLocaleString("en-IN")}. Please check the amounts.`, "PAYMENT_MISMATCH");
  }
  for (const p of input.payments) {
    if (p.method === "CASH" && p.tendered != null && p.tendered < p.amount) throw badRequest("Cash received is less than the cash amount");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const customer = await upsertPosCustomer(tx, input.customer);
      const number = await nextBillNumber(tx, settings.invoicePrefix || "RSS");

      const order = await tx.order.create({
        data: {
          orderNumber: number,
          channel: "POS",
          status: "DELIVERED",
          idempotencyKey: input.idempotencyKey,
          customerId: customer.id,
          cashierId: staff.id,
          approvedById: approver?.id ?? null,
          registerSessionId: register.id,
          subtotal: quote.subtotal,
          discount: quote.couponDiscount,
          couponCode: quote.couponCode,
          manualDiscount: quote.manualDiscount,
          shipping: 0,
          total: quote.total,
          // Shop bills keep the customer's details on the order and the shop as the address.
          customerName: customer.name && customer.name !== WALK_IN_NAME ? customer.name : WALK_IN_NAME,
          customerEmail: customer.email ?? "",
          customerPhone: customer.phone ?? input.customer.phone,
          shippingAddress: {
            name: "In-store purchase",
            street: settings.addressLine || settings.storeName,
            city: settings.city || "-",
            state: settings.state || "-",
            pincode: settings.pincode || "-",
            phone: settings.phone || "",
          },
          items: {
            create: quote.lines.map((l) => ({
              productId: l.unit.productId,
              variantId: l.unit.kind === "variant" ? l.unit.id : null,
              variantName: l.size,
              name: l.name,
              quantity: l.quantity,
              price: l.unitPrice,
              mrp: l.unitMrp,
              lineDiscount: l.discount,
              image: l.imageUrl,
            })),
          },
          payments: {
            create: input.payments.map((p) => ({
              method: p.method,
              amount: p.amount,
              tendered: p.method === "CASH" && p.tendered != null ? p.tendered : null,
              reference: p.reference || null,
            })),
          },
        },
        select: { id: true },
      });

      await commitStockForOrder(tx, order.id, { reason: "POS_SALE", userId: staff.id });
      if (quote.couponId) {
        await tx.couponRedemption.createMany({ data: [{ couponId: quote.couponId, userId: customer.id, orderId: order.id }], skipDuplicates: true });
      }
      // The email typed at the counter wins (the customer just asked for the bill there).
      return { id: order.id, billNumber: number, emailTo: input.customer.email || customer.email || null };
    }, TX_OPTIONS);
  } catch (error) {
    // Two submits with the same key racing: the loser returns the winner's bill.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && String(error.meta?.target).includes("idempotencyKey")) {
      const winner = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: { id: true, orderNumber: true } });
      if (winner) return { id: winner.id, billNumber: winner.orderNumber, emailTo: null };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Reading bills
// ---------------------------------------------------------------------------

const billInclude = {
  items: { orderBy: { id: "asc" as const } },
  payments: { orderBy: { createdAt: "asc" as const } },
  cashier: { select: { name: true, email: true } },
  approvedBy: { select: { name: true, email: true } },
  registerSession: { select: { closedAt: true } },
} satisfies Prisma.OrderInclude;

type BillRow = Prisma.OrderGetPayload<{ include: typeof billInclude }>;

function toBillView(o: BillRow): BillView {
  return {
    id: o.id,
    billNumber: o.orderNumber,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    cancelledAt: o.cancelledAt?.toISOString() ?? null,
    cancelReason: o.status === "CANCELLED" ? o.cancelReason : null,
    customer: { name: o.customerName === WALK_IN_NAME ? null : o.customerName, phone: o.customerPhone ?? "", email: o.customerEmail || null },
    cashier: o.cashier ? (o.cashier.name || o.cashier.email) : null,
    approvedBy: o.approvedBy ? (o.approvedBy.name || o.approvedBy.email) : null,
    items: o.items.map((i) => ({
      id: i.id,
      name: i.name,
      size: i.variantName,
      quantity: i.quantity,
      unitPrice: i.price,
      unitMrp: i.mrp ?? i.price,
      discount: i.lineDiscount,
      lineTotal: i.price * i.quantity - i.lineDiscount,
    })),
    subtotal: o.subtotal,
    mrpSavings: o.items.reduce((s, i) => s + Math.max(0, (i.mrp ?? i.price) - i.price) * i.quantity, 0),
    couponCode: o.couponCode,
    couponDiscount: o.discount,
    manualDiscount: o.manualDiscount,
    total: o.total,
    payments: o.payments.map((p) => ({ method: p.method as PaymentMethodType, amount: p.amount, tendered: p.tendered, reference: p.reference })),
    registerOpen: Boolean(o.registerSession && !o.registerSession.closedAt),
  };
}

export async function getBill(id: string) {
  const order = await prisma.order.findFirst({ where: { id, channel: "POS" }, include: billInclude });
  if (!order) throw notFound("Bill not found");
  return toBillView(order);
}

/** Shop bills for one IST day (newest first), optionally filtered by bill no. / phone / name. */
export async function listBills(params: { date: string; q?: string }) {
  const { start, end } = istRange(params.date);
  const q = params.q?.trim();
  const orders = await prisma.order.findMany({
    where: {
      channel: "POS",
      createdAt: { gte: start, lt: end },
      ...(q
        ? { OR: [{ orderNumber: { contains: q, mode: "insensitive" } }, { customerPhone: { contains: q } }, { customerName: { contains: q, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { payments: { select: { method: true, amount: true } }, items: { select: { quantity: true } }, cashier: { select: { name: true } } },
  });
  return orders.map((o) => ({
    id: o.id,
    billNumber: o.orderNumber,
    status: o.status,
    customerName: o.customerName,
    customerPhone: o.customerPhone ?? "",
    itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
    total: o.total,
    methods: [...new Set(o.payments.map((p) => p.method))] as PaymentMethodType[],
    cashier: o.cashier?.name ?? null,
    createdAt: o.createdAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Cancelling a bill (mistakes only: the shop has no returns / exchanges)
// ---------------------------------------------------------------------------

/**
 * Cancel a shop bill: stock goes back (shared with the website) and the bill no longer counts
 * in sales or the drawer. Managers and the owner can cancel directly; a cashier needs a
 * manager's PIN. Only allowed while the bill's day is still open, so a closed day's cash
 * count stays right.
 */
export async function cancelBill(session: { staff: PosStaff }, id: string, reason: string, approval?: { staffId: string; pin: string }) {
  const { staff } = session;
  const order = await prisma.order.findFirst({ where: { id, channel: "POS" }, include: { registerSession: { select: { closedAt: true } } } });
  if (!order) throw notFound("Bill not found");
  if (order.status === "CANCELLED") throw conflict("This bill is already cancelled");
  if (!order.registerSession || order.registerSession.closedAt) {
    throw badRequest("This bill is from a day that's already closed, so it can't be cancelled here.");
  }

  let by = staff;
  if (!atLeast(staff.role, "MANAGER")) {
    if (!approval) throw new AppError(403, "Cancelling a bill needs a manager's PIN", "APPROVAL_REQUIRED");
    by = (await verifyApproval(approval))!;
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id, status: "DELIVERED" },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelledById: by.id, cancelReason: reason },
    });
    if (updated.count === 0) throw conflict("This bill was just changed by someone else. Please refresh.");
    await restoreStockForOrder(tx, id, { userId: by.id, note: `Bill ${order.orderNumber} cancelled: ${reason}` });
    // A cancelled bill shouldn't use up the customer's coupon.
    await tx.couponRedemption.deleteMany({ where: { orderId: id } });
  }, TX_OPTIONS);
  return getBill(id);
}
