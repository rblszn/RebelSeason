import { prisma } from "@/lib/db";

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
}

export interface SalesChartPoint {
  date: string;
  sales: number;
  orders: number;
  revenue: number;
}

/**
 * Fetch aggregate metrics for the admin dashboard:
 * - totalRevenue: sum of amounts for payments with status CAPTURED
 * - totalOrders: total count of orders
 * - totalCustomers: total count of users with role CUSTOMER
 * - totalProducts: total count of products
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [revenueResult, totalOrders, totalCustomers, totalProducts] =
    await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "CAPTURED" },
      }),
      prisma.order.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.product.count(),
    ]);

  return {
    totalRevenue: revenueResult._sum.amount ?? 0,
    totalOrders,
    totalCustomers,
    totalProducts,
  };
}

/**
 * Paid sales for the last 7 days (today included), bucketed by day in IST.
 */
export async function getSalesChartData(): Promise<SalesChartPoint[]> {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const todayStartIst = Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate());
  const since = new Date(todayStartIst - 6 * DAY_MS - IST_OFFSET_MS);

  const payments = await prisma.payment.findMany({
    where: { status: "CAPTURED", capturedAt: { gte: since } },
    select: { amount: true, capturedAt: true },
  });

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
