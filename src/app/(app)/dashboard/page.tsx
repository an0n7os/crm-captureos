import Link from "next/link";
import type { Metadata } from "next";
import {
  CalendarClock,
  FolderKanban,
  Inbox,
  MessageSquare,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { PlanBanner, UsageStrip } from "@/components/dashboard/usage-strip";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { planFor } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getDashboardData } from "@/lib/queries/dashboard";
import { requireUser } from "@/lib/session";
import { DELIVERABLE_STATUS, meta } from "@/lib/status";
import { formatCompactCurrency, formatCurrency, formatDate, relativeDays } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const currency = user.studio.currency;
  const studioId = user.studioId;

  const [d, quotations, invoices, clients, users] = await Promise.all([
    getDashboardData(studioId),
    prisma.quotation.count({ where: { studioId } }),
    prisma.invoice.count({ where: { studioId } }),
    prisma.client.count({ where: { studioId } }),
    prisma.user.count({ where: { studioId, isActive: true } }),
  ]);

  const usage = { quotations, invoices, clients, users };
  const planLimits = planFor(user.studio.plan).limits;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Good ${greeting()}, ${user.name.split(" ")[0]}`}
        description="Your studio at a glance."
      />

      <PlanBanner
        plan={user.studio.plan}
        renewsAt={user.studio.planRenewsAt?.toISOString() ?? null}
      />

      <UsageStrip
        tiles={[
          {
            label: "Leads",
            value: d.enquiries.total,
            limit: planLimits.leadsPerMonth,
            href: "/enquiries",
            secondary: { label: "won", value: d.enquiries.won },
          },
          {
            label: "Projects",
            value: d.projects.total,
            limit: planLimits.projects,
            href: "/projects",
          },
          { label: "Quotations", value: usage.quotations, limit: null, href: "/quotations" },
          { label: "Invoices", value: usage.invoices, limit: null, href: "/finances" },
          {
            label: "Team",
            value: usage.users,
            limit: planLimits.users,
            href: "/team",
            secondary: { label: "crew", value: d.team.total },
          },
          { label: "Clients", value: usage.clients, limit: null, href: "/projects" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          title="Enquiries"
          icon={Inbox}
          tone="info"
          href="/enquiries"
          metrics={[
            { label: "New", value: d.enquiries.new, tone: d.enquiries.new > 0 ? "info" : undefined },
            { label: "Follow up", value: d.enquiries.followUp, tone: "warning" },
            { label: "Revise", value: d.enquiries.revise, tone: "danger" },
          ]}
        >
          <p className="text-xs text-muted-foreground">
            {d.enquiries.total === 0
              ? "No enquiries yet."
              : `${d.enquiries.leadsPerDay.toFixed(1)} leads / day over the last 30 days · ${d.enquiries.won} won`}
          </p>
        </StatCard>

        <StatCard
          title="Projects"
          icon={FolderKanban}
          tone="primary"
          href="/projects"
          metrics={[
            { label: "Active", value: d.projects.total, tone: "primary" },
            {
              label: "Next up",
              value: d.projects.next ? (
                <span className="block truncate text-base leading-tight">{d.projects.next.name}</span>
              ) : (
                "—"
              ),
            },
            {
              label: "Needs info",
              value: d.projects.missing,
              tone: d.projects.missing > 0 ? "warning" : undefined,
            },
          ]}
        >
          <p className="text-xs text-muted-foreground">
            {d.projects.next
              ? `${formatDate(d.projects.next.startDate)} · ${relativeDays(d.projects.next.startDate)}`
              : "No upcoming shoots scheduled."}
          </p>
        </StatCard>

        <StatCard
          title="Post Production"
          icon={Sparkles}
          tone="warning"
          href="/post-production"
          metrics={[
            { label: "In progress", value: d.post.inProgress, tone: "primary" },
            { label: "Not started", value: d.post.notStarted },
            { label: "In review", value: d.post.review, tone: "info" },
          ]}
        >
          <p className="text-xs text-muted-foreground">
            {d.post.changes > 0
              ? `${d.post.changes} awaiting changes from client feedback.`
              : "No change requests pending."}
          </p>
        </StatCard>

        <StatCard
          title="Client Requests"
          icon={MessageSquare}
          tone="danger"
          href="/requests"
          metrics={[
            { label: "New", value: d.requests.new, tone: d.requests.new > 0 ? "danger" : undefined },
            { label: "Pending", value: d.requests.pending, tone: "warning" },
            { label: "In progress", value: d.requests.inProgress, tone: "primary" },
          ]}
        />

        <StatCard
          title="Team"
          icon={Users}
          tone="success"
          href="/team"
          metrics={[
            { label: "Total", value: d.team.total },
            { label: "In house", value: d.team.inHouse, tone: "success" },
            { label: "Freelancer", value: d.team.freelancer, tone: "info" },
          ]}
        />

        <StatCard
          title="Finances"
          icon={Wallet}
          tone="success"
          href="/finances"
          metrics={[
            { label: "Received", value: formatCompactCurrency(d.finances.received, currency), tone: "success" },
            { label: "Balance due", value: formatCompactCurrency(d.finances.balanceDue, currency), tone: "warning" },
            {
              label: "Net profit",
              value: formatCompactCurrency(d.finances.netProfit, currency),
              tone: d.finances.netProfit >= 0 ? "success" : "danger",
            },
          ]}
        >
          <p className="text-xs text-muted-foreground">
            {formatCurrency(d.finances.expenses, currency)} spent across all projects.
          </p>
        </StatCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Booked value trend */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Booked value</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Last 6 months</p>
            </div>
            <Link href="/reports" className="text-xs font-medium text-primary hover:opacity-75">
              Reports
            </Link>
          </div>

          {d.finances.nextDuePayment && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-warning/25 bg-warning-soft px-3.5 py-3">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-warning" />
              <div className="min-w-0 text-sm">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-warning">
                  Next payment due
                </p>
                <p className="mt-0.5 truncate font-medium">
                  {formatCurrency(d.finances.nextDuePayment.balance, currency)} ·{" "}
                  {d.finances.nextDuePayment.project?.name ?? d.finances.nextDuePayment.client.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(d.finances.nextDuePayment.dueDate)} ·{" "}
                  {relativeDays(d.finances.nextDuePayment.dueDate)}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4">
            <RevenueChart data={d.finances.monthly} currency={currency} />
          </div>
        </Card>

        {/* Delivery timeline */}
        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Delivery timeline</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Deliverables due next</p>
            </div>
            <Link href="/projects" className="text-xs font-medium text-primary hover:opacity-75">
              View all
            </Link>
          </div>

          {d.upcomingDeliverables.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No upcoming deadlines"
              description="Add deliverables to a project to see their due dates here."
              className="flex-1 py-10"
            />
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {d.upcomingDeliverables.map((item) => {
                const m = meta(DELIVERABLE_STATUS, item.status);
                const overdue = item.dueDate ? new Date(item.dueDate) < new Date() : false;

                return (
                  <li key={item.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/projects/${item.project.id}`}
                        className="block truncate text-sm font-medium hover:text-primary"
                      >
                        {item.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">{item.project.name}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-xs font-medium ${overdue ? "text-danger" : "text-muted-foreground"}`}
                      >
                        {relativeDays(item.dueDate)}
                      </p>
                      <Badge variant={m.variant} className="mt-1">
                        {m.label}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming shoots */}
        <Card className="flex flex-col p-5">
          <h2 className="text-sm font-semibold tracking-tight">Upcoming shoots</h2>

          {d.upcomingEventDays.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nothing scheduled"
              description="Event days you add to a project will appear here."
              className="flex-1 py-10"
            />
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {d.upcomingEventDays.map((ev) => (
                <li key={ev.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary">
                    <span className="text-sm font-semibold leading-none tabular">
                      {new Date(ev.date).getDate()}
                    </span>
                    <span className="mt-0.5 text-[10px] uppercase text-muted-foreground">
                      {new Date(ev.date).toLocaleString("en-IN", { month: "short" })}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/projects/${ev.project.id}`}
                      className="block truncate text-sm font-medium hover:text-primary"
                    >
                      {ev.title}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {ev.project.name}
                      {ev.venue ? ` · ${ev.venue}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {ev.assignments.length > 0
                      ? `${ev.assignments.length} crew`
                      : "No crew"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Activity */}
        <Card className="flex flex-col p-5">
          <h2 className="text-sm font-semibold tracking-tight">Recent activity</h2>

          {d.recentActivity.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No activity yet"
              description="Actions across your studio show up here as your team works."
              className="flex-1 py-10"
            />
          ) : (
            <ul className="mt-4 space-y-3">
              {d.recentActivity.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0">
                    <p className="text-sm">{a.summary ?? a.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.user?.name ?? "System"} · {relativeDays(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
