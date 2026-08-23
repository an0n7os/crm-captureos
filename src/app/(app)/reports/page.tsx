import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { ReportCharts } from "@/components/reports/report-charts";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TableWrap, TR } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { SOURCE_LABEL } from "@/lib/status";
import { cn, formatCurrency, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

type SearchParams = Promise<{ months?: string }>;

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const months = [6, 12, 24].includes(Number(sp.months)) ? Number(sp.months) : 12;

  const studioId = user.studioId;
  const currency = user.studio.currency;

  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [payments, expenses, projects, enquiries, crewLoad] = await Promise.all([
    prisma.payment.findMany({
      where: { studioId, paidOn: { gte: since } },
      select: { amount: true, paidOn: true },
    }),
    prisma.expense.findMany({
      where: { studioId, spentOn: { gte: since } },
      select: { amount: true, spentOn: true, category: true },
    }),
    prisma.project.findMany({
      where: { studioId, createdAt: { gte: since } },
      select: { createdAt: true, packageValue: true, eventType: true, status: true },
    }),
    prisma.enquiry.findMany({
      where: { studioId, createdAt: { gte: since } },
      select: { source: true, status: true, budgetMax: true },
    }),
    prisma.crewAssignment.groupBy({
      by: ["crewId"],
      where: { studioId, eventDay: { date: { gte: since } } },
      _count: { _all: true },
      _sum: { agreedFee: true },
    }),
  ]);

  // Monthly buckets, oldest first.
  const buckets: { label: string; received: number; spent: number; booked: number }[] = [];
  const indexOf = new Map<string, number>();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    indexOf.set(key, buckets.length);
    buckets.push({
      label: d.toLocaleString("en-IN", { month: "short", year: months > 12 ? "2-digit" : undefined }),
      received: 0,
      spent: 0,
      booked: 0,
    });
  }

  const bucketFor = (date: Date) => indexOf.get(`${date.getFullYear()}-${date.getMonth()}`);

  for (const p of payments) {
    const i = bucketFor(p.paidOn);
    if (i !== undefined) buckets[i].received += toNumber(p.amount);
  }
  for (const e of expenses) {
    const i = bucketFor(e.spentOn);
    if (i !== undefined) buckets[i].spent += toNumber(e.amount);
  }
  for (const p of projects) {
    const i = bucketFor(p.createdAt);
    if (i !== undefined) buckets[i].booked += toNumber(p.packageValue);
  }

  // Lead source conversion.
  const sourceStats = new Map<string, { total: number; won: number; value: number }>();
  for (const e of enquiries) {
    const row = sourceStats.get(e.source) ?? { total: 0, won: 0, value: 0 };
    row.total += 1;
    if (e.status === "WON") {
      row.won += 1;
      row.value += toNumber(e.budgetMax);
    }
    sourceStats.set(e.source, row);
  }
  const sources = [...sourceStats.entries()].sort((a, b) => b[1].total - a[1].total);

  // Expense split by category.
  const categoryTotals = new Map<string, number>();
  for (const e of expenses) {
    categoryTotals.set(e.category, (categoryTotals.get(e.category) ?? 0) + toNumber(e.amount));
  }

  const crewIds = crewLoad.map((c) => c.crewId);
  const crewNames = await prisma.crewMember.findMany({
    where: { id: { in: crewIds } },
    select: { id: true, name: true, type: true },
  });
  const nameOf = new Map(crewNames.map((c) => [c.id, c]));

  const totalReceived = buckets.reduce((s, b) => s + b.received, 0);
  const totalSpent = buckets.reduce((s, b) => s + b.spent, 0);
  const totalBooked = buckets.reduce((s, b) => s + b.booked, 0);
  const wonCount = enquiries.filter((e) => e.status === "WON").length;
  const conversion = enquiries.length > 0 ? Math.round((wonCount / enquiries.length) * 100) : 0;

  const hasData = totalReceived > 0 || totalSpent > 0 || enquiries.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Reports"
        description={`Where your bookings, revenue and effort went over the last ${months} months.`}
        actions={
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            {[6, 12, 24].map((m) => (
              <Link
                key={m}
                href={m === 12 ? "/reports" : `/reports?months=${m}`}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  months === m
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}m
              </Link>
            ))}
          </div>
        }
      />

      {!hasData ? (
        <Card>
          <EmptyState
            icon={BarChart3}
            title="Not enough data yet"
            description="Once you record enquiries, payments and expenses, your trends show up here."
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Received", value: formatCurrency(totalReceived, currency), tone: "text-success" },
              { label: "Spent", value: formatCurrency(totalSpent, currency), tone: "text-danger" },
              {
                label: "Net",
                value: formatCurrency(totalReceived - totalSpent, currency),
                tone: totalReceived - totalSpent >= 0 ? "text-success" : "text-danger",
              },
              { label: "Lead conversion", value: `${conversion}%`, tone: "" },
            ].map((s) => (
              <Card key={s.label} className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </p>
                <p className={cn("mt-1.5 text-2xl font-semibold tabular", s.tone)}>{s.value}</p>
              </Card>
            ))}
          </div>

          <ReportCharts
            monthly={buckets}
            categories={[...categoryTotals.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([name, value]) => ({ name, value }))}
            currency={currency}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="p-5 pb-0">
                <h2 className="text-sm font-semibold">Lead sources</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Which channels actually convert. {formatCurrency(totalBooked, currency)} booked in
                  total.
                </p>
              </div>

              <TableWrap className="mt-4">
                <Table>
                  <THead>
                    <TR className="hover:bg-transparent">
                      <TH>Source</TH>
                      <TH className="text-right">Leads</TH>
                      <TH className="text-right">Won</TH>
                      <TH className="text-right">Rate</TH>
                      <TH className="text-right">Value</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {sources.map(([source, stat]) => (
                      <TR key={source}>
                        <TD className="text-sm">{SOURCE_LABEL[source] ?? source}</TD>
                        <TD className="text-right text-sm tabular">{stat.total}</TD>
                        <TD className="text-right text-sm tabular text-success">{stat.won}</TD>
                        <TD className="text-right text-sm tabular">
                          {Math.round((stat.won / stat.total) * 100)}%
                        </TD>
                        <TD className="text-right text-sm tabular">
                          {formatCurrency(stat.value, currency)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            </Card>

            <Card>
              <div className="p-5 pb-0">
                <h2 className="text-sm font-semibold">Crew utilisation</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Days booked and fees committed per person.
                </p>
              </div>

              {crewLoad.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">No crew bookings in this period.</p>
              ) : (
                <TableWrap className="mt-4">
                  <Table>
                    <THead>
                      <TR className="hover:bg-transparent">
                        <TH>Crew</TH>
                        <TH>Type</TH>
                        <TH className="text-right">Days</TH>
                        <TH className="text-right">Fees</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {crewLoad
                        .sort((a, b) => b._count._all - a._count._all)
                        .map((row) => {
                          const crew = nameOf.get(row.crewId);
                          return (
                            <TR key={row.crewId}>
                              <TD className="text-sm font-medium">{crew?.name ?? "—"}</TD>
                              <TD className="text-sm text-muted-foreground">
                                {crew?.type === "IN_HOUSE" ? "In house" : "Freelance"}
                              </TD>
                              <TD className="text-right text-sm tabular">{row._count._all}</TD>
                              <TD className="text-right text-sm tabular">
                                {formatCurrency(row._sum.agreedFee ?? 0, currency)}
                              </TD>
                            </TR>
                          );
                        })}
                    </TBody>
                  </Table>
                </TableWrap>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
