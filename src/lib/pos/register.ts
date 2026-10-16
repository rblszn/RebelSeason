import { prisma, type Db } from "@/lib/db";
import { badRequest, conflict } from "@/lib/api";

/**
 * The shop's cash drawer, one "day" at a time. Billing needs an open day. Closing compares
 * the cash that should be in the drawer (opening cash + cash taken on bills that weren't
 * cancelled) with the cash counted, and records any difference. Money is whole rupees.
 */

// Several queries run inside these transactions; allow time when the database is far away.
const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

// Serialises open/close so two devices can't open two days at once.
const REGISTER_LOCK = 4_242_001;

export async function getOpenRegister(db: Db = prisma) {
  return db.registerSession.findFirst({
    where: { closedAt: null },
    orderBy: { openedAt: "desc" },
    include: { openedBy: { select: { name: true, email: true } } },
  });
}

export async function openRegister(userId: string, openingCash: number) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${REGISTER_LOCK})`;
    if (await getOpenRegister(tx)) throw conflict("The day is already open", "REGISTER_OPEN");
    return tx.registerSession.create({ data: { openedById: userId, openingCash } });
  }, TX_OPTIONS);
}

/** Totals for a register session (bills not cancelled). */
export async function registerSummary(sessionId: string, db: Db = prisma) {
  const session = await db.registerSession.findUnique({ where: { id: sessionId } });
  if (!session) throw badRequest("Register session not found");
  const [payments, bills, cancelled] = await Promise.all([
    db.orderPayment.groupBy({
      by: ["method"],
      where: { order: { registerSessionId: sessionId, status: { not: "CANCELLED" } } },
      _sum: { amount: true },
      _count: true,
    }),
    db.order.aggregate({
      where: { registerSessionId: sessionId, status: { not: "CANCELLED" } },
      _count: true,
      _sum: { total: true, manualDiscount: true, discount: true },
    }),
    db.order.count({ where: { registerSessionId: sessionId, status: "CANCELLED" } }),
  ]);
  const byMethod = (m: "CASH" | "UPI" | "CARD") => payments.find((p) => p.method === m)?._sum.amount ?? 0;
  const cash = byMethod("CASH");
  return {
    id: session.id,
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    openingCash: session.openingCash,
    billCount: bills._count,
    cancelledCount: cancelled,
    sales: bills._sum.total ?? 0,
    // Coupon discounts are stored in `discount`, counter discounts in `manualDiscount`.
    discounts: (bills._sum.manualDiscount ?? 0) + (bills._sum.discount ?? 0),
    cash,
    upi: byMethod("UPI"),
    card: byMethod("CARD"),
    expectedCash: session.openingCash + cash,
    countedCash: session.countedCash,
    difference: session.difference,
    note: session.note,
  };
}

export async function closeRegister(userId: string, countedCash: number, note?: string | null) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${REGISTER_LOCK})`;
    const open = await getOpenRegister(tx);
    if (!open) throw conflict("The day isn't open", "REGISTER_CLOSED");
    const summary = await registerSummary(open.id, tx);
    const difference = countedCash - summary.expectedCash;
    if (difference !== 0 && !note?.trim()) throw badRequest("The counted cash doesn't match. Add a note explaining the difference.", "NOTE_REQUIRED");
    const closedAt = new Date();
    await tx.registerSession.update({
      where: { id: open.id },
      data: { closedAt, closedById: userId, expectedCash: summary.expectedCash, countedCash, difference, note: note?.trim() || null },
    });
    return { ...summary, closedAt: closedAt.toISOString(), countedCash, difference, note: note?.trim() || null };
  }, TX_OPTIONS);
}

/** Recent days (closed and open) for the register screen and admin. */
export async function listRegisterSessions(take = 10) {
  const rows = await prisma.registerSession.findMany({
    orderBy: { openedAt: "desc" },
    take,
    include: { openedBy: { select: { name: true } }, closedBy: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    openedAt: r.openedAt.toISOString(),
    closedAt: r.closedAt?.toISOString() ?? null,
    openedBy: r.openedBy.name,
    closedBy: r.closedBy?.name ?? null,
    openingCash: r.openingCash,
    expectedCash: r.expectedCash,
    countedCash: r.countedCash,
    difference: r.difference,
    note: r.note,
  }));
}
