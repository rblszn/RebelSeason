import type { OrderStatus } from "@prisma/client";
import { prisma, type Db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

/**
 * Shop customers are found by mobile number. A shop customer is an ordinary customer account
 * that may have no email and no password (they never signed in online). If they later sign up
 * online with the same number, the online sign-up adopts that account (see claimShopCustomer),
 * so the shop and website purchases show together.
 */

/** Name stored for a customer who didn't give one at the counter. */
export const WALK_IN_NAME = "Walk-in customer";

/** Orders that count as purchases: not unpaid (PENDING) and not cancelled. */
const PAID: { notIn: OrderStatus[] } = { notIn: ["PENDING", "CANCELLED"] };

const customerSelect = { id: true, name: true, email: true, phone: true } as const;

/** The account behind a phone number. Prefers one that also has an online login (an email). */
async function accountByPhone(db: Db, phone: string) {
  return db.user.findFirst({
    where: { phone, role: "CUSTOMER" },
    orderBy: [{ email: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    select: customerSelect,
  });
}

export async function findCustomerByPhone(phone: string) {
  const user = await accountByPhone(prisma, phone);
  if (!user) return null;
  const full = await prisma.user.findUnique({ where: { id: user.id }, select: { createdAt: true } });
  const [paid, recent] = await Promise.all([
    prisma.order.groupBy({
      by: ["channel"],
      where: { customerId: user.id, status: PAID },
      _count: true,
      _sum: { total: true },
      _max: { createdAt: true },
    }),
    prisma.order.findMany({
      where: { customerId: user.id, status: PAID },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, orderNumber: true, channel: true, total: true, createdAt: true, items: { select: { name: true, quantity: true } } },
    }),
  ]);
  const by = (c: "ONLINE" | "POS") => paid.find((p) => p.channel === c);
  const last = paid
    .map((p) => p._max.createdAt)
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  return {
    id: user.id,
    name: user.name === WALK_IN_NAME ? null : user.name,
    email: user.email,
    phone: user.phone,
    createdAt: (full?.createdAt ?? new Date()).toISOString(),
    shopOrders: by("POS")?._count ?? 0,
    onlineOrders: by("ONLINE")?._count ?? 0,
    totalSpent: paid.reduce((s, p) => s + (p._sum.total ?? 0), 0),
    lastPurchaseAt: last?.toISOString() ?? null,
    recent: recent.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      channel: o.channel,
      total: o.total,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((i) => `${i.name}${i.quantity > 1 ? ` × ${i.quantity}` : ""}`).join(", "),
    })),
  };
}

/**
 * Find or create the customer for a shop bill. Matching: phone first, then email.
 * Missing name / email / phone are filled in, but existing details are never overwritten.
 */
export async function upsertPosCustomer(db: Db, input: { phone: string; name?: string | null; email?: string | null }) {
  const name = input.name?.trim() || null;
  const email = input.email?.trim().toLowerCase() || null;

  let user = await accountByPhone(db, input.phone);
  if (!user && email) {
    const byEmail = await db.user.findUnique({ where: { email }, select: customerSelect });
    if (byEmail) {
      user = byEmail.phone ? byEmail : await db.user.update({ where: { id: byEmail.id }, data: { phone: input.phone }, select: customerSelect });
    }
  }
  if (!user) {
    return db.user.create({ data: { name: name ?? WALK_IN_NAME, phone: input.phone, email, role: "CUSTOMER", password: null }, select: customerSelect });
  }

  const patch: { name?: string; email?: string } = {};
  if ((!user.name || user.name === WALK_IN_NAME) && name) patch.name = name;
  if (!user.email && email && !(await db.user.findUnique({ where: { email }, select: { id: true } }))) patch.email = email;
  return Object.keys(patch).length ? db.user.update({ where: { id: user.id }, data: patch, select: customerSelect }) : user;
}

/** How a phone number is saved from the website: the clean 10 digits when it is one, otherwise as typed. */
export function phoneForStorage(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  return normalizePhone(raw) ?? raw.trim().slice(0, 20);
}

/**
 * Call after an online account gets a phone number (sign-up, guest checkout, profile). If a
 * phone-only shop customer already holds that number, their purchases and coupon use move to
 * this account and the shop record is removed, so the customer has one history, not two.
 * Never throws: a merge problem must not block signing up or checking out.
 */
export async function mergeShopCustomerInto(userId: string, phone: string | null): Promise<boolean> {
  const number = normalizePhone(phone);
  if (!number) return false;
  try {
    return await prisma.$transaction(async (tx) => {
      const shop = await tx.user.findFirst({
        where: { phone: number, role: "CUSTOMER", email: null, password: null, id: { not: userId } },
        select: { id: true },
      });
      if (!shop) return false;
      await tx.order.updateMany({ where: { customerId: shop.id }, data: { customerId: userId } });
      // A coupon can be used once per customer: if both already used one, keep this account's use.
      const mine = await tx.couponRedemption.findMany({ where: { userId }, select: { couponId: true } });
      if (mine.length) await tx.couponRedemption.deleteMany({ where: { userId: shop.id, couponId: { in: mine.map((m) => m.couponId) } } });
      await tx.couponRedemption.updateMany({ where: { userId: shop.id }, data: { userId } });
      await tx.user.delete({ where: { id: shop.id } });
      return true;
    }, { maxWait: 10_000, timeout: 30_000 });
  } catch (error) {
    console.error("Could not merge shop customer into online account:", error);
    return false;
  }
}
