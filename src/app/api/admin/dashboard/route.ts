import { NextResponse } from "next/server";
import { getDashboardStats, getSalesChartData } from "@/lib/dal";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [stats, recentOrders, salesChart] = await Promise.all([
      getDashboardStats(),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: true,
          payment: true,
        },
      }),
      getSalesChartData(),
    ]);

    return NextResponse.json({
      success: true,
      stats,
      totalRevenue: stats.totalRevenue,
      totalOrders: stats.totalOrders,
      totalCustomers: stats.totalCustomers,
      totalProducts: stats.totalProducts,
      salesChart,
      recentSales: salesChart,
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        total: order.total,
        status: order.status,
        paymentStatus: order.payment?.status ?? "UNPAID",
        paymentMethod: order.payment?.method ?? "COD",
        createdAt: order.createdAt,
        itemCount: order.items.length,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch admin dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to retrieve dashboard data" },
      { status: 500 }
    );
  }
}
