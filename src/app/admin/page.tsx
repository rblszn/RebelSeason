import { getDashboardStats, getSalesChartData, getAllOrders, getTodayStats, type TodayStats } from "@/lib/dal";
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
  Store,
  Globe,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  let stats = {
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    shopBills: 0,
    shopRevenue: 0,
    websiteRevenue: 0,
  };
  let today: TodayStats = { shopSales: 0, shopBills: 0, websiteSales: 0, websiteOrders: 0, cashInDrawer: null, dayOpen: false, refundsNeeded: [] };
  let recentOrders: Awaited<ReturnType<typeof getAllOrders>> = [];
  let chartData: Awaited<ReturnType<typeof getSalesChartData>> = [];

  try {
    const [fetchedStats, fetchedOrders, fetchedChart, fetchedToday] = await Promise.all([
      getDashboardStats(),
      getAllOrders({ limit: 5 }),
      getSalesChartData(),
      getTodayStats(),
    ]);
    stats = fetchedStats;
    today = fetchedToday;
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
          description={`Website ₹${stats.websiteRevenue.toLocaleString("en-IN")} + shop ₹${stats.shopRevenue.toLocaleString("en-IN")}`}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-700"
        />

        <KPICard
          title="Total Orders"
          value={stats.totalOrders.toLocaleString("en-IN")}
          icon={ShoppingBag}
          trend={{ value: "8.5% vs last week", isPositive: true }}
          description={`Website orders. Shop bills: ${stats.shopBills.toLocaleString("en-IN")}`}
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

      {/* Refund alert: paid online, but the last piece was sold in the shop meanwhile */}
      {today.refundsNeeded.length > 0 && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-amber-900">
                {today.refundsNeeded.length} online {today.refundsNeeded.length === 1 ? "order was" : "orders were"} paid, but the item sold out in the shop first
              </p>
              <p className="mt-1 text-sm text-amber-900/80">Contact these customers or refund them in Razorpay, then cancel the order.</p>
              <ul className="mt-3 space-y-1 text-sm">
                {today.refundsNeeded.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-amber-900 underline underline-offset-2">
                      {o.orderNumber}
                    </Link>{" "}
                    <span className="text-amber-900/80">
                      · {o.customerName} · ₹{o.total.toLocaleString("en-IN")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Today: shop vs website, and the cash drawer */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Today</h2>
          <Link href="/admin/reports" className="text-xs font-medium text-gray-600 underline underline-offset-2 hover:text-gray-900">
            Sales reports
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Store className="h-4 w-4" /> Shop
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">₹{today.shopSales.toLocaleString("en-IN")}</p>
            <p className="text-xs text-gray-500">
              {today.shopBills} {today.shopBills === 1 ? "bill" : "bills"}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Globe className="h-4 w-4" /> Website
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">₹{today.websiteSales.toLocaleString("en-IN")}</p>
            <p className="text-xs text-gray-500">
              {today.websiteOrders} {today.websiteOrders === 1 ? "order" : "orders"}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Wallet className="h-4 w-4" /> Cash in the drawer
            </p>
            {today.cashInDrawer === null ? (
              <>
                <p className="mt-1 text-2xl font-bold tracking-tight text-gray-400">Day not open</p>
                <p className="text-xs text-gray-500">Opened from the POS</p>
              </>
            ) : (
              <>
                <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">₹{today.cashInDrawer.toLocaleString("en-IN")}</p>
                <p className="text-xs text-gray-500">Opening cash + cash sales</p>
              </>
            )}
          </div>
        </div>
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
