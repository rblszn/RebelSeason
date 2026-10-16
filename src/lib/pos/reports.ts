import { Prisma, type OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { istDate, istRange } from "@/lib/ist";

/**
 * Sales reports for Admin -> Reports, over an inclusive range of IST days. "Sales" are orders
 * that were paid and not cancelled: website orders from confirmed to delivered, and shop bills
 * (delivered at the counter). Prices include taxes; item revenue is after line discounts
 * (bill-level discounts are shown separately). All amounts are whole rupees.
 */

const PAID_STATUSES: OrderStatus[] = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];
const paid = Prisma.join(PAID_STATUSES.map((s) => Prisma.sql`${s}::"OrderStatus"`));

type Channel = "ONLINE" | "POS";

export async function salesReport(from: string, to: string) {
  const { start, end } = istRange(from, to);
  const inRange = { createdAt: { gte: start, lt: end } };
  const paidWhere = { ...inRange, status: { in: PAID_STATUSES } };

  const [byChannel, daily, posPayments, onlinePaid, categories, staff, products, cancelled, slow, stockValue] = await Promise.all([
    prisma.order.groupBy({
      by: ["channel"],
      where: paidWhere,
      _count: true,
      _sum: { total: true, discount: true, manualDiscount: true },
    }),
    prisma.$queryRaw<{ day: string; channel: Channel; total: number; orders: number }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
             channel, SUM(total)::int AS total, COUNT(*)::int AS orders
      FROM "orders"
      WHERE "createdAt" >= ${start} AND "createdAt" < ${end} AND status IN (${paid})
      GROUP BY 1, 2 ORDER BY 1`,
    prisma.orderPayment.groupBy({ by: ["method"], where: { order: { ...paidWhere, channel: "POS" } }, _sum: { amount: true }, _count: true }),
    prisma.order.aggregate({ where: { ...paidWhere, channel: "ONLINE" }, _sum: { total: true }, _count: true }),
    prisma.$queryRaw<{ department: string | null; category: string | null; qty: number; revenue: number }[]>`
      SELECT d.name AS department, c.name AS category, SUM(oi.quantity)::int AS qty,
             SUM(oi.price * oi.quantity - oi."lineDiscount")::int AS revenue
      FROM "order_items" oi
      JOIN "orders" o ON o.id = oi."orderId"
      LEFT JOIN "products" p ON p.id = oi."productId"
      LEFT JOIN "categories" c ON c.id = p."categoryId"
      LEFT JOIN "categories" d ON d.id = c."parentId"
      WHERE o."createdAt" >= ${start} AND o."createdAt" < ${end} AND o.status IN (${paid})
      GROUP BY 1, 2 ORDER BY revenue DESC`,
    prisma.order.groupBy({ by: ["cashierId"], where: { ...paidWhere, channel: "POS" }, _count: true, _sum: { total: true, manualDiscount: true } }),
    prisma.$queryRaw<{ name: string; qty: number; revenue: number; shop: number; online: number }[]>`
      SELECT oi.name AS name, SUM(oi.quantity)::int AS qty,
             SUM(oi.price * oi.quantity - oi."lineDiscount")::int AS revenue,
             SUM(CASE WHEN o.channel = 'POS' THEN oi.quantity ELSE 0 END)::int AS shop,
             SUM(CASE WHEN o.channel = 'ONLINE' THEN oi.quantity ELSE 0 END)::int AS online
      FROM "order_items" oi JOIN "orders" o ON o.id = oi."orderId"
      WHERE o."createdAt" >= ${start} AND o."createdAt" < ${end} AND o.status IN (${paid})
      GROUP BY 1 ORDER BY qty DESC, revenue DESC LIMIT 15`,
    prisma.order.groupBy({ by: ["channel"], where: { ...inRange, status: "CANCELLED" }, _count: true, _sum: { total: true } }),
    // In stock but not sold in the range: what's sitting on the shelf (sizes, and products without sizes).
    prisma.$queryRaw<{ id: string; productId: string; name: string; size: string | null; stock: number; value: number; lastSold: Date | null }[]>`
      SELECT * FROM (
        SELECT v.id, v."productId", p.name, v.size, v.stock, (p.price * v.stock)::int AS value,
               (SELECT MAX(o."createdAt") FROM "order_items" oi JOIN "orders" o ON o.id = oi."orderId"
                WHERE oi."variantId" = v.id AND o.status IN (${paid})) AS "lastSold",
               NOT EXISTS (SELECT 1 FROM "order_items" oi JOIN "orders" o ON o.id = oi."orderId"
                WHERE oi."variantId" = v.id AND o."createdAt" >= ${start} AND o."createdAt" < ${end} AND o.status IN (${paid})) AS idle
        FROM "product_variants" v JOIN "products" p ON p.id = v."productId"
        WHERE v.stock > 0
        UNION ALL
        SELECT p.id, p.id AS "productId", p.name, NULL AS size, p.stock, (p.price * p.stock)::int AS value,
               (SELECT MAX(o."createdAt") FROM "order_items" oi JOIN "orders" o ON o.id = oi."orderId"
                WHERE oi."productId" = p.id AND oi."variantId" IS NULL AND o.status IN (${paid})) AS "lastSold",
               NOT EXISTS (SELECT 1 FROM "order_items" oi JOIN "orders" o ON o.id = oi."orderId"
                WHERE oi."productId" = p.id AND oi."variantId" IS NULL AND o."createdAt" >= ${start} AND o."createdAt" < ${end} AND o.status IN (${paid})) AS idle
        FROM "products" p
        WHERE p."hasVariants" = false AND p.stock > 0
      ) u WHERE u.idle ORDER BY u.value DESC LIMIT 20`,
    prisma.$queryRaw<{ units: number; value: number; mrpValue: number }[]>`
      SELECT COALESCE(SUM(u.stock), 0)::int AS units, COALESCE(SUM(u.price * u.stock), 0)::int AS value, COALESCE(SUM(u.mrp * u.stock), 0)::int AS "mrpValue"
      FROM (
        SELECT v.stock, p.price, GREATEST(COALESCE(p."originalPrice", p.price), p.price) AS mrp
        FROM "product_variants" v JOIN "products" p ON p.id = v."productId" WHERE v.stock > 0
        UNION ALL
        SELECT p.stock, p.price, GREATEST(COALESCE(p."originalPrice", p.price), p.price) AS mrp
        FROM "products" p WHERE p."hasVariants" = false AND p.stock > 0
      ) u`,
  ]);

  const cashierIds = staff.map((s) => s.cashierId).filter((id): id is string => Boolean(id));
  const names = cashierIds.length ? await prisma.user.findMany({ where: { id: { in: cashierIds } }, select: { id: true, name: true, email: true } }) : [];
  const nameOf = new Map(names.map((n) => [n.id, n.name || n.email || "Staff"]));

  const channel = (c: Channel) => byChannel.find((r) => r.channel === c);
  const sum = (c: Channel) => channel(c)?._sum.total ?? 0;
  const count = (c: Channel) => channel(c)?._count ?? 0;

  // One row per day in the range (days with no sales show 0).
  const days: { day: string; online: number; shop: number; orders: number }[] = [];
  for (let t = start.getTime(); t < end.getTime(); t += 86_400_000) days.push({ day: istDate(new Date(t)), online: 0, shop: 0, orders: 0 });
  for (const d of daily) {
    const row = days.find((x) => x.day === d.day);
    if (!row) continue;
    if (d.channel === "POS") row.shop += d.total;
    else row.online += d.total;
    row.orders += d.orders;
  }

  const pay = (m: "CASH" | "UPI" | "CARD") => posPayments.find((p) => p.method === m)?._sum.amount ?? 0;
  return {
    from,
    to,
    totals: {
      sales: sum("ONLINE") + sum("POS"),
      orders: count("ONLINE") + count("POS"),
      online: { sales: sum("ONLINE"), orders: count("ONLINE") },
      shop: { sales: sum("POS"), bills: count("POS") },
      couponDiscounts: (channel("ONLINE")?._sum.discount ?? 0) + (channel("POS")?._sum.discount ?? 0),
      shopDiscounts: channel("POS")?._sum.manualDiscount ?? 0,
      cancelled: {
        online: cancelled.find((c) => c.channel === "ONLINE")?._count ?? 0,
        shop: cancelled.find((c) => c.channel === "POS")?._count ?? 0,
        shopAmount: cancelled.find((c) => c.channel === "POS")?._sum.total ?? 0,
      },
    },
    daily: days,
    payments: [
      { label: "Cash (shop)", amount: pay("CASH") },
      { label: "UPI (shop)", amount: pay("UPI") },
      { label: "Card (shop)", amount: pay("CARD") },
      { label: "Online payments (website)", amount: onlinePaid._sum.total ?? 0 },
    ],
    categories: categories.map((c) => ({ name: [c.department ?? "Deleted products", c.category].filter(Boolean).join(" › "), qty: c.qty, revenue: c.revenue })),
    staff: staff
      .map((s) => ({ name: s.cashierId ? (nameOf.get(s.cashierId) ?? "Staff") : "Unknown", bills: s._count, sales: s._sum.total ?? 0, discounts: s._sum.manualDiscount ?? 0 }))
      .sort((a, b) => b.sales - a.sales),
    topProducts: products.map((p) => ({ name: p.name, qty: p.qty, shop: p.shop, online: p.online, revenue: p.revenue })),
    slowMoving: slow.map((v) => ({
      id: v.id,
      productId: v.productId,
      name: v.name,
      variant: v.size ? `Size ${v.size}` : "",
      stock: v.stock,
      value: v.value,
      lastSold: v.lastSold ? v.lastSold.toISOString() : null,
    })),
    stock: { units: stockValue[0]?.units ?? 0, value: stockValue[0]?.value ?? 0, mrpValue: stockValue[0]?.mrpValue ?? 0 },
  };
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Quote, and neutralise spreadsheet formulas (a cell starting with = + - @).
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** Every order in the range (both channels, all statuses) as CSV for Excel or the accountant. */
export async function salesCsv(from: string, to: string) {
  const { start, end } = istRange(from, to);
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: start, lt: end } },
    orderBy: { createdAt: "asc" },
    include: { payments: true, items: { select: { quantity: true } }, cashier: { select: { name: true } }, payment: { select: { status: true, method: true } } },
  });
  const header = ["Date (IST)", "Time (IST)", "Channel", "Order / bill no.", "Status", "Customer", "Phone", "Items", "Subtotal", "Coupon", "Coupon discount", "Counter discount", "Shipping", "Total", "Paid by", "Cashier"];
  const time = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
  const lines = orders.map((o) =>
    [
      istDate(o.createdAt),
      time.format(o.createdAt),
      o.channel === "POS" ? "Shop" : "Website",
      o.orderNumber,
      o.status,
      o.customerName,
      o.customerPhone ?? "",
      o.items.reduce((s, i) => s + i.quantity, 0),
      o.subtotal,
      o.couponCode ?? "",
      o.discount,
      o.manualDiscount,
      o.shipping,
      o.total,
      o.channel === "POS"
        ? o.payments.map((p) => `${p.method} ${p.amount}`).join(" + ")
        : o.payment?.status === "CAPTURED"
          ? o.payment.method === "COD"
            ? "Cash on delivery"
            : "Online"
          : "",
      o.cashier?.name ?? "",
    ]
      .map(csvCell)
      .join(",")
  );
  // Byte-order mark so Excel reads the file as UTF-8.
  return "﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n");
}
