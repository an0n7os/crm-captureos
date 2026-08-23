"use client";

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/status";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";

// Fixed hues so a category keeps its colour between renders.
const SLICE_COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
];

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-popover)",
  color: "var(--color-popover-foreground)",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
};

export function ReportCharts({
  monthly,
  categories,
  currency,
}: {
  monthly: { label: string; received: number; spent: number; booked: number }[];
  categories: { name: string; value: number }[];
  currency: string;
}) {
  const pieData = categories.slice(0, 8).map((c) => ({
    name: EXPENSE_CATEGORY_LABEL[c.name] ?? c.name,
    value: c.value,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-2">
        <h2 className="text-sm font-semibold">Money in vs money out</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Payments received against expenses recorded, per month.
        </p>

        <div className="mt-5 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                dy={4}
              />
              <YAxis
                width={60}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickFormatter={(v: number) => (v === 0 ? "0" : formatCompactCurrency(v, currency))}
              />
              <Tooltip
                cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
                contentStyle={tooltipStyle}
                formatter={(value) => formatCurrency(value as number, currency)}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="received" name="Received" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="spent" name="Spent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="booked" name="Booked" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">Where the money goes</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Expenses by category.</p>

        {pieData.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            No expenses in this period.
          </p>
        ) : (
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={2}
                  stroke="var(--color-card)"
                  strokeWidth={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => formatCurrency(value as number, currency)}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
