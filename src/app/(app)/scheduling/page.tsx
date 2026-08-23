import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { ScheduleCalendar } from "@/components/scheduling/schedule-calendar";
import { UnavailabilityPanel } from "@/components/scheduling/unavailability-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Crew Scheduling" };

type SearchParams = Promise<{ month?: string }>;

/** Parses "2026-08" into a month start, falling back to the current month. */
function parseMonth(value?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export default async function SchedulingPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;

  const monthStart = parseMonth(sp.month);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  // Pad the range so the leading and trailing week cells are populated too.
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()) + 1);

  const [eventDays, crew, unavailability] = await Promise.all([
    prisma.eventDay.findMany({
      where: { studioId: user.studioId, date: { gte: gridStart, lt: gridEnd } },
      orderBy: { date: "asc" },
      include: {
        project: { select: { id: true, name: true, code: true } },
        assignments: {
          include: { crew: { select: { id: true, name: true, type: true } } },
        },
      },
    }),
    prisma.crewMember.findMany({
      where: { studioId: user.studioId, isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, role: true, type: true, dayRate: true },
    }),
    prisma.crewUnavailability.findMany({
      where: { studioId: user.studioId, endDate: { gte: gridStart }, startDate: { lt: gridEnd } },
      include: { crew: { select: { id: true, name: true } } },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const prevMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  const unassignedDays = eventDays.filter(
    (d) => d.assignments.length === 0 && d.date >= monthStart && d.date < monthEnd,
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Crew Scheduling"
        description="Assign your team per event day. Clashes are blocked automatically."
        actions={
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" asChild aria-label="Previous month">
              <Link href={`/scheduling?month=${monthKey(prevMonth)}`}>
                <ChevronLeft />
              </Link>
            </Button>
            <span className="min-w-36 text-center text-sm font-medium">
              {monthStart.toLocaleString("en-IN", { month: "long", year: "numeric" })}
            </span>
            <Button variant="outline" size="icon" asChild aria-label="Next month">
              <Link href={`/scheduling?month=${monthKey(nextMonth)}`}>
                <ChevronRight />
              </Link>
            </Button>
            <Button variant="outline" asChild className="ml-1.5">
              <Link href="/scheduling">
                <CalendarDays />
                Today
              </Link>
            </Button>
          </div>
        }
      />

      {unassignedDays > 0 && (
        <Card className="border-warning/30 bg-warning-soft p-4">
          <p className="text-sm text-warning">
            {unassignedDays} event {unassignedDays === 1 ? "day" : "days"} this month{" "}
            {unassignedDays === 1 ? "has" : "have"} no crew assigned yet.
          </p>
        </Card>
      )}

      <ScheduleCalendar
        monthStart={monthStart.toISOString()}
        eventDays={eventDays.map((d) => ({
          id: d.id,
          title: d.title,
          date: d.date.toISOString(),
          startTime: d.startTime,
          venue: d.venue,
          eventType: d.eventType,
          project: d.project,
          assignments: d.assignments.map((a) => ({
            id: a.id,
            role: a.role,
            status: a.status,
            agreedFee: a.agreedFee ? toNumber(a.agreedFee) : null,
            crew: a.crew,
          })),
        }))}
        crew={crew.map((c) => ({
          id: c.id,
          name: c.name,
          role: c.role,
          type: c.type,
          dayRate: c.dayRate ? toNumber(c.dayRate) : null,
        }))}
        unavailability={unavailability.map((u) => ({
          crewId: u.crewId,
          startDate: u.startDate.toISOString(),
          endDate: u.endDate.toISOString(),
        }))}
        currency={user.studio.currency}
      />

      <UnavailabilityPanel
        crew={crew.map((c) => ({ id: c.id, name: c.name }))}
        entries={unavailability.map((u) => ({
          id: u.id,
          crewName: u.crew.name,
          startDate: u.startDate.toISOString(),
          endDate: u.endDate.toISOString(),
          reason: u.reason,
        }))}
      />
    </div>
  );
}
