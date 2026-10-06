"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { SalesChartPoint } from "@/lib/dal/dashboard";
import { TrendingUp } from "lucide-react";

interface SalesChartProps {
  data: SalesChartPoint[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: SalesChartPoint;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg font-sans">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        <p className="text-base font-bold text-gray-900 mt-1">
          ₹{item.sales.toLocaleString("en-IN")}
        </p>
        <p className="text-xs text-gray-600 mt-0.5">
          {item.orders} {item.orders === 1 ? "order" : "orders"} placed
        </p>
      </div>
    );
  }
  return null;
}

export function SalesChart({ data }: SalesChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalPeriodRevenue = data.reduce((acc, curr) => acc + curr.sales, 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs font-sans">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">
              Sales Revenue
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <TrendingUp className="h-3 w-3" />
              Recent Trend
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Revenue trajectory over recent operational cycle
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-xs text-gray-500 uppercase font-medium">Cycle Total</p>
          <p className="text-lg font-bold text-gray-900">
            ₹{totalPeriodRevenue.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="mt-6 h-72 w-full">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#18181b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#18181b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f3f4f6"
              />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => (value >= 1000 ? `₹${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : `₹${value}`)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#18181b"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#salesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          /* Placeholder state before client mount / SSR fallback */
          <div className="flex h-full w-full items-center justify-center rounded-lg bg-gray-50 border border-dashed border-gray-200">
            <div className="text-center">
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading chart telemetry...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
