import { getDashboardStats, getSalesChartData, getAllOrders } from "@/lib/dal";
import { KPICard } from "@/components/admin/KPICard";
import { SalesChart } from "@/components/admin/SalesChart";
import { RecentOrdersWidget } from "@/components/admin/RecentOrdersWidget";
import {
  IndianRupee,
  ShoppingBag,
  Package,
  Users,
  Calendar,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  let stats = {
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
  };
  let recentOrders: Awaited<ReturnType<typeof getAllOrders>> = [];
  let chartData: Awaited<ReturnType<typeof getSalesChartData>> = [];

  try {
    const [fetchedStats, fetchedOrders, fetchedChart] = await Promise.all([
      getDashboardStats(),
      getAllOrders({ limit: 5 }),
      getSalesChartData(),
    ]);
    stats = fetchedStats;
    recentOrders = fetchedOrders;
    chartData = fetchedChart;
  } catch (error) {
    console.error("Error loading admin dashboard metrics directly from DAL:", error);
  }

  const currentDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner / Welcome header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Dashboard Overview
            </h1>
            <span className="hidden items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 sm:inline-flex">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Live Store Data
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Real-time performance analytics, revenue tracking, and order fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            <span>{currentDate}</span>
          </div>

          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-gray-800 transition-colors"
          >
            <span>Manage Catalog</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
        <KPICard
          title="Total Revenue"
          value={`₹${stats.totalRevenue.toLocaleString("en-IN")}`}
          icon={IndianRupee}
          trend={{ value: "14.2% vs last month", isPositive: true }}
          description="Captured payments"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-700"
        />

        <KPICard
          title="Total Orders"
          value={stats.totalOrders.toLocaleString("en-IN")}
          icon={ShoppingBag}
          trend={{ value: "8.5% vs last week", isPositive: true }}
          description="All statuses included"
          iconBg="bg-blue-50"
          iconColor="text-blue-700"
        />

        <KPICard
          title="Total Products"
          value={stats.totalProducts.toLocaleString("en-IN")}
          icon={Package}
          description="Active catalog styles"
          iconBg="bg-purple-50"
          iconColor="text-purple-700"
        />

        <KPICard
          title="Total Customers"
          value={stats.totalCustomers.toLocaleString("en-IN")}
          icon={Users}
          trend={{ value: "12 new buyers", isPositive: true }}
          description="Registered shopper accounts"
          iconBg="bg-amber-50"
          iconColor="text-amber-700"
        />
      </div>

      {/* Sales Performance Chart (Placeholder / Interactive Recharts component) */}
      <div className="w-full">
        <SalesChart data={chartData} />
      </div>

      {/* Recent Orders Widget */}
      <div className="w-full">
        <RecentOrdersWidget orders={recentOrders} />
      </div>
    </div>
  );
}
