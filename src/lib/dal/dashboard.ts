import { prisma } from "@/lib/db";

export interface DashboardStats {
  totalRevenue: number;
  /** Website orders only; shop bills are counted in shopBills. */
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  shopBills: number;
  shopRevenue: number;
  websiteRevenue: number;
}

export interface TodayStats {
  shopSales: number;
  shopBills: number;
  websiteSales: number;
  websiteOrders: number;
  /** Cash that should be in the drawer right now, or null when the day isn't open. */
  cashInDrawer: number | null;
  dayOpen: boolean;
  /** Paid online but the last piece was sold in the shop meanwhile: needs a refund or a call. */
  refundsNeeded: { id: string; orderNumber: string; customerName: string; total: number }[];
}

export interface SalesChartPoint {
  date: string;
  sales: number;
  orders: number;
  revenue: number;
}

/**
 * Fetch aggregate metrics for the admin dashboard:
 * - totalRevenue: website payments captured + shop bills (not cancelled)
 * - totalOrders: count of website orders
 * - totalCustomers: customers who have bought something (online or in the shop)
 * - totalProducts: total count of products
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [revenueResult, shopResult, totalOrders, totalCustomers, totalProducts] =
    await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "CAPTURED" },
      }),
      prisma.order.aggregate({
        _sum: { total: true },
        _count: true,
        where: { channel: "POS", status: { not: "CANCELLED" } },
      }),
      prisma.order.count({ where: { channel: "ONLINE" } }),
      prisma.user.count({ where: { role: "CUSTOMER", orders: { some: {} } } }),
      prisma.product.count(),
    ]);

  const websiteRevenue = revenueResult._sum.amount ?? 0;
  const shopRevenue = shopResult._sum.total ?? 0;
  return {
    totalRevenue: websiteRevenue + shopRevenue,
    totalOrders,
    totalCustomers,
    totalProducts,
    shopBills: shopResult._count,
    shopRevenue,
    websiteRevenue,
  };
}

/** Today's shop vs website sales, the cash drawer and any online orders that need a refund. */
export async function getTodayStats(): Promise<TodayStats> {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const start = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate()) - IST_OFFSET_MS);

  const [shop, web, open, refunds] = await Promise.all([
    prisma.order.aggregate({ _sum: { total: true }, _count: true, where: { channel: "POS", status: { not: "CANCELLED" }, createdAt: { gte: start } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, _count: true, where: { status: "CAPTURED", capturedAt: { gte: start } } }),
    prisma.registerSession.findFirst({ where: { closedAt: null }, orderBy: { openedAt: "desc" }, select: { id: true, openingCash: true } }),
    prisma.order.findMany({
      where: { channel: "ONLINE", status: { not: "CANCELLED" }, notes: { startsWith: "Paid online, but not enough stock" } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, orderNumber: true, customerName: true, total: true },
    }),
  ]);

  let cashInDrawer: number | null = null;
  if (open) {
    const cash = await prisma.orderPayment.aggregate({
      _sum: { amount: true },
      where: { method: "CASH", order: { registerSessionId: open.id, status: { not: "CANCELLED" } } },
    });
    cashInDrawer = open.openingCash + (cash._sum.amount ?? 0);
  }

  return {
    shopSales: shop._sum.total ?? 0,
    shopBills: shop._count,
    websiteSales: web._sum.amount ?? 0,
    websiteOrders: web._count,
    cashInDrawer,
    dayOpen: Boolean(open),
    refundsNeeded: refunds,
  };
}

/**
 * Paid sales for the last 7 days (today included), website and shop together, bucketed by day in IST.
 */
export async function getSalesChartData(): Promise<SalesChartPoint[]> {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const todayStartIst = Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate());
  const since = new Date(todayStartIst - 6 * DAY_MS - IST_OFFSET_MS);

  const [online, shop] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "CAPTURED", capturedAt: { gte: since } },
      select: { amount: true, capturedAt: true },
    }),
    // Shop bills count on the day they were billed (cancelled ones don't count).
    prisma.order.findMany({
      where: { channel: "POS", status: { not: "CANCELLED" }, createdAt: { gte: since } },
      select: { total: true, createdAt: true },
    }),
  ]);
  const payments = [
    ...online.map((p) => ({ amount: p.amount, capturedAt: p.capturedAt })),
    ...shop.map((o) => ({ amount: o.total, capturedAt: o.createdAt })),
  ];

  const days: SalesChartPoint[] = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = todayStartIst - (6 - i) * DAY_MS;
    days.push({
      date: new Date(dayStart).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }),
      sales: 0,
      orders: 0,
      revenue: 0,
    });
  }

  for (const p of payments) {
    if (!p.capturedAt) continue;
    const ist = p.capturedAt.getTime() + IST_OFFSET_MS;
    const index = 6 - Math.floor((todayStartIst + DAY_MS - 1 - ist) / DAY_MS);
    if (index < 0 || index > 6) continue;
    days[index].sales += p.amount;
    days[index].revenue += p.amount;
    days[index].orders += 1;
  }

  return days;
}
