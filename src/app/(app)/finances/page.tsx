import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { ExpensesPanel } from "@/components/finance/expenses-panel";
import { PayoutsPanel } from "@/components/finance/payouts-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TableWrap, TR } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { INVOICE_STATUS, meta } from "@/lib/status";
import { cn, formatCurrency, formatDate, relativeDays, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Finances" };

type SearchParams = Promise<{ tab?: string }>;

const TABS = [
  { key: "invoices", label: "Invoices" },
  { key: "expenses", label: "Expenses" },
  { key: "payouts", label: "Crew payouts" },
];

export default async function FinancesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "invoices";
  const studioId = user.studioId;
  const currency = user.studio.currency;

  const [invoices, expenses, payouts, projects, crew] = await Promise.all([
    prisma.invoice.findMany({
      where: { studioId },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { name: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.expense.findMany({
      where: { studioId },
      orderBy: { spentOn: "desc" },
      include: { project: { select: { id: true, name: true } } },
      take: 200,
    }),
    prisma.payout.findMany({
      where: { studioId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        crew: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.project.findMany({
      where: { studioId, status: { notIn: ["CANCELLED"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
    prisma.crewMember.findMany({
      where: { studioId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const live = invoices.filter((i) => i.status !== "DRAFT" && i.status !== "CANCELLED");
  const invoiced = live.reduce((s, i) => s + toNumber(i.total), 0);
  const received = invoices.reduce((s, i) => s + toNumber(i.amountPaid), 0);
  const outstanding = Math.max(invoiced - received, 0);
  const spent = expenses.reduce((s, e) => s + toNumber(e.amount), 0);
  const pendingPayouts = payouts
    .filter((p) => p.status === "PENDING")
    .reduce((s, p) => s + toNumber(p.amount), 0);
  const profit = received - spent;

  const overdue = live.filter(
    (i) => i.dueDate && i.dueDate < new Date() && toNumber(i.amountPaid) < toNumber(i.total),
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Finances"
        description="Invoices, payments, expenses and what's left over."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/finances/expenses/new">
                <Plus />
                Expense
              </Link>
            </Button>
            <Button asChild>
              <Link href="/finances/invoices/new">
                <Receipt />
                New invoice
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Received", value: received, icon: TrendingUp, tone: "text-success" },
          { label: "Outstanding", value: outstanding, icon: Wallet, tone: "text-warning" },
          { label: "Expenses", value: spent, icon: TrendingDown, tone: "text-danger" },
          {
            label: "Net profit",
            value: profit,
            icon: Wallet,
            tone: profit >= 0 ? "text-success" : "text-danger",
          },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center gap-2">
              <s.icon className={cn("size-4", s.tone)} />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {s.label}
              </p>
            </div>
            <p className={cn("mt-2 text-2xl font-semibold tabular", s.tone)}>
              {formatCurrency(s.value, currency)}
            </p>
          </Card>
        ))}
      </div>

      {(overdue.length > 0 || pendingPayouts > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {overdue.length > 0 && (
            <Card className="border-danger/30 bg-danger-soft p-4">
              <p className="text-sm font-medium text-danger">
                {overdue.length} overdue {overdue.length === 1 ? "invoice" : "invoices"}
              </p>
              <p className="mt-0.5 text-xs text-danger/80">
                {formatCurrency(
                  overdue.reduce((s, i) => s + toNumber(i.total) - toNumber(i.amountPaid), 0),
                  currency,
                )}{" "}
                still to collect.
              </p>
            </Card>
          )}

          {pendingPayouts > 0 && (
            <Card className="border-warning/30 bg-warning-soft p-4">
              <p className="text-sm font-medium text-warning">Crew payouts pending</p>
              <p className="mt-0.5 text-xs text-warning/80">
                {formatCurrency(pendingPayouts, currency)} owed to your team.
              </p>
            </Card>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "invoices" ? "/finances" : `/finances?tab=${t.key}`}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.key
                ? "border-primary bg-primary-soft text-accent-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "invoices" &&
        (invoices.length === 0 ? (
          <Card>
            <EmptyState
              icon={Receipt}
              title="No invoices yet"
              description="Raise your first invoice to start tracking payments."
              action={
                <Button asChild>
                  <Link href="/finances/invoices/new">
                    <Plus />
                    New invoice
                  </Link>
                </Button>
              }
            />
          </Card>
        ) : (
          <Card>
            <TableWrap>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Invoice</TH>
                    <TH>Client</TH>
                    <TH>Issued</TH>
                    <TH>Due</TH>
                    <TH>Total</TH>
                    <TH>Paid</TH>
                    <TH>Balance</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {invoices.map((inv) => {
                    const m = meta(INVOICE_STATUS, inv.status);
                    const balance = toNumber(inv.total) - toNumber(inv.amountPaid);
                    const isOverdue =
                      inv.dueDate && inv.dueDate < new Date() && balance > 0 && inv.status !== "DRAFT";

                    return (
                      <TR key={inv.id}>
                        <TD>
                          <Link href={`/finances/invoices/${inv.id}`} className="group block">
                            <span className="block text-sm font-medium group-hover:text-primary">
                              {inv.number}
                            </span>
                            {inv.project && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {inv.project.name}
                              </span>
                            )}
                          </Link>
                        </TD>
                        <TD className="text-sm">{inv.client.name}</TD>
                        <TD className="whitespace-nowrap text-sm">{formatDate(inv.issueDate)}</TD>
                        <TD className="whitespace-nowrap">
                          {inv.dueDate ? (
                            <span className={cn("text-sm", isOverdue && "text-danger")}>
                              {relativeDays(inv.dueDate)}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TD>
                        <TD className="whitespace-nowrap text-sm tabular">
                          {formatCurrency(inv.total, currency)}
                        </TD>
                        <TD className="whitespace-nowrap text-sm tabular text-success">
                          {formatCurrency(inv.amountPaid, currency)}
                        </TD>
                        <TD className="whitespace-nowrap text-sm tabular">
                          <span className={balance > 0 ? "text-warning" : "text-muted-foreground"}>
                            {formatCurrency(balance, currency)}
                          </span>
                        </TD>
                        <TD>
                          <Badge variant={m.variant}>{m.label}</Badge>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </TableWrap>
          </Card>
        ))}

      {tab === "expenses" && (
        <ExpensesPanel
          expenses={expenses.map((e) => ({
            id: e.id,
            title: e.title,
            category: e.category,
            amount: toNumber(e.amount),
            spentOn: e.spentOn.toISOString(),
            vendor: e.vendor,
            method: e.method,
            note: e.note,
            project: e.project,
          }))}
          projects={projects}
          currency={currency}
        />
      )}

      {tab === "payouts" && (
        <PayoutsPanel
          payouts={payouts.map((p) => ({
            id: p.id,
            amount: toNumber(p.amount),
            status: p.status,
            method: p.method,
            paidOn: p.paidOn?.toISOString() ?? null,
            note: p.note,
            crew: p.crew,
            project: p.project,
          }))}
          crew={crew}
          projects={projects}
          currency={currency}
        />
      )}
    </div>
  );
}
