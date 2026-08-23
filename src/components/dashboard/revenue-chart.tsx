"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCompactCurrency, formatCurrency } from "@/lib/utils";

export function RevenueChart({
  data,
  currency = "INR",
}: {
  data: { label: string; value: number }[];
  currency?: string;
}) {
  const allZero = data.every((d) => d.value === 0);

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="bookedValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            dy={4}
          />
          <YAxis
            width={56}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickFormatter={(v: number) => (v === 0 ? "0" : formatCompactCurrency(v, currency))}
            // A flat zero series would otherwise render a 0–0 axis.
            domain={allZero ? [0, 1] : [0, "auto"]}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-border)" }}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              background: "var(--color-popover)",
              color: "var(--color-popover-foreground)",
              fontSize: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            }}
            labelStyle={{ color: "var(--color-muted-foreground)", marginBottom: 2 }}
            formatter={(value) => [formatCurrency(value, currency), "Booked"] as [string, string]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-success)"
            strokeWidth={2}
            fill="url(#bookedValue)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
