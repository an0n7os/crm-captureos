import "server-only";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function getDashboardData(studioId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const sixMonthsAgo = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 5, 1));

  const [
    enquiryCounts,
    leadsLast30,
    projectCount,
    nextProject,
    projectsMissingDetails,
    postCounts,
    requestCounts,
    crewCounts,
    invoiceTotals,
    expenseTotal,
    nextDuePayment,
    upcomingDeliverables,
    recentActivity,
    monthlyProjects,
    upcomingEventDays,
  ] = await Promise.all([
    prisma.enquiry.groupBy({
      by: ["status"],
      where: { studioId },
      _count: { _all: true },
    }),

    prisma.enquiry.count({ where: { studioId, createdAt: { gte: thirtyDaysAgo } } }),

    prisma.project.count({
      where: { studioId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    }),

    prisma.project.findFirst({
      where: { studioId, startDate: { gte: now }, status: { notIn: ["CANCELLED"] } },
      orderBy: { startDate: "asc" },
      select: { id: true, name: true, code: true, startDate: true, venue: true },
    }),

    // "Missing" = booked work with no shoot date or no deliverables planned yet.
    prisma.project.count({
      where: {
        studioId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        OR: [{ startDate: null }, { deliverables: { none: {} } }],
      },
    }),

    prisma.postTask.groupBy({
      by: ["status"],
      where: { studioId },
      _count: { _all: true },
    }),

    prisma.clientRequest.groupBy({
      by: ["status"],
      where: { studioId },
      _count: { _all: true },
    }),

    prisma.crewMember.groupBy({
      by: ["type"],
      where: { studioId, isActive: true },
      _count: { _all: true },
    }),

    prisma.invoice.aggregate({
      where: { studioId, status: { notIn: ["DRAFT", "CANCELLED"] } },
      _sum: { total: true, amountPaid: true },
    }),

    prisma.expense.aggregate({ where: { studioId }, _sum: { amount: true } }),

    prisma.invoice.findFirst({
      where: {
        studioId,
        status: { in: ["SENT", "PARTIAL", "OVERDUE"] },
        dueDate: { not: null },
      },
      orderBy: { dueDate: "asc" },
      select: {
        id: true,
        number: true,
        total: true,
        amountPaid: true,
        dueDate: true,
        project: { select: { name: true } },
        client: { select: { name: true } },
      },
    }),

    prisma.deliverable.findMany({
      where: {
        studioId,
        status: { notIn: ["DELIVERED"] },
        dueDate: { not: null },
      },
      orderBy: { dueDate: "asc" },
      take: 6,
      select: {
        id: true,
        name: true,
        dueDate: true,
        status: true,
        project: { select: { id: true, name: true } },
      },
    }),

    prisma.activity.findMany({
      where: { studioId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        summary: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),

    // Booked value per month, used for the six-month trend line.
    prisma.project.findMany({
      where: { studioId, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, packageValue: true },
    }),

    prisma.eventDay.findMany({
      where: { studioId, date: { gte: now } },
      orderBy: { date: "asc" },
      take: 6,
      select: {
        id: true,
        title: true,
        date: true,
        venue: true,
        project: { select: { id: true, name: true } },
        assignments: { select: { crew: { select: { name: true } } } },
      },
    }),
  ]);

  const byStatus = (rows: { status: string; _count: { _all: number } }[]) =>
    Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Record<string, number>;

  const enquiries = byStatus(enquiryCounts);
  const post = byStatus(postCounts);
  const requests = byStatus(requestCounts);

  const inHouse = crewCounts.find((c) => c.type === "IN_HOUSE")?._count._all ?? 0;
  const freelancer = crewCounts.find((c) => c.type === "FREELANCER")?._count._all ?? 0;

  const invoiced = toNumber(invoiceTotals._sum.total);
  const received = toNumber(invoiceTotals._sum.amountPaid);
  const expenses = toNumber(expenseTotal._sum.amount);

  // Six month buckets, oldest first, zero-filled so the chart never has gaps.
  const months: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString("en-IN", { month: "short" }),
      value: 0,
    });
  }
  for (const p of monthlyProjects) {
    const diff =
      (now.getFullYear() - p.createdAt.getFullYear()) * 12 +
      (now.getMonth() - p.createdAt.getMonth());
    const idx = 5 - diff;
    if (idx >= 0 && idx < 6) months[idx].value += toNumber(p.packageValue);
  }

  return {
    enquiries: {
      new: enquiries.NEW ?? 0,
      followUp: enquiries.FOLLOW_UP ?? 0,
      revise: enquiries.REVISE ?? 0,
      won: enquiries.WON ?? 0,
      leadsPerDay: leadsLast30 / 30,
      total: Object.values(enquiries).reduce((a, b) => a + b, 0),
    },
    projects: {
      total: projectCount,
      missing: projectsMissingDetails,
      next: nextProject,
    },
    post: {
      notStarted: post.NOT_STARTED ?? 0,
      inProgress: post.IN_PROGRESS ?? 0,
      review: post.REVIEW ?? 0,
      changes: post.CHANGES_REQUESTED ?? 0,
    },
    requests: {
      new: requests.NEW ?? 0,
      pending: requests.PENDING ?? 0,
      inProgress: requests.IN_PROGRESS ?? 0,
    },
    team: { total: inHouse + freelancer, inHouse, freelancer },
    finances: {
      invoiced,
      received,
      balanceDue: Math.max(invoiced - received, 0),
      expenses,
      netProfit: received - expenses,
      nextDuePayment: nextDuePayment
        ? {
            ...nextDuePayment,
            balance: toNumber(nextDuePayment.total) - toNumber(nextDuePayment.amountPaid),
          }
        : null,
      monthly: months,
    },
    upcomingDeliverables,
    upcomingEventDays,
    recentActivity,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
