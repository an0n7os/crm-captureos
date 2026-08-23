"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Loader2, MapPin, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, NativeSelect, Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import {
  assignCrewAction,
  removeAssignmentAction,
  updateAssignmentStatusAction,
} from "@/lib/actions/crew-actions";
import { ASSIGNMENT_STATUS, CREW_ROLE_LABEL, EVENT_TYPE_LABEL, meta } from "@/lib/status";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

type Assignment = {
  id: string;
  role: string;
  status: string;
  agreedFee: number | null;
  crew: { id: string; name: string; type: string };
};

export type CalendarEventDay = {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  venue: string | null;
  eventType: string;
  project: { id: string; name: string; code: string };
  assignments: Assignment[];
};

type CrewOption = {
  id: string;
  name: string;
  role: string;
  type: string;
  dayRate: number | null;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function ScheduleCalendar({
  monthStart,
  eventDays,
  crew,
  unavailability,
  currency,
}: {
  monthStart: string;
  eventDays: CalendarEventDay[];
  crew: CrewOption[];
  unavailability: { crewId: string; startDate: string; endDate: string }[];
  currency: string;
}) {
  const [selected, setSelected] = React.useState<CalendarEventDay | null>(null);

  const start = new Date(monthStart);
  const month = start.getMonth();

  // Six rows of seven always renders a stable grid height.
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    return date;
  });

  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarEventDay[]>();
    for (const day of eventDays) {
      const key = dayKey(new Date(day.date));
      map.set(key, [...(map.get(key) ?? []), day]);
    }
    return map;
  }, [eventDays]);

  const todayKey = dayKey(new Date());

  return (
    <>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            const key = dayKey(date);
            const items = byDay.get(key) ?? [];
            const isCurrentMonth = date.getMonth() === month;
            const isToday = key === todayKey;

            return (
              <div
                key={i}
                className={cn(
                  "min-h-28 border-b border-r border-border p-1.5 last:border-r-0",
                  i % 7 === 6 && "border-r-0",
                  !isCurrentMonth && "bg-muted/40",
                )}
              >
                <div className="mb-1 flex items-center justify-between px-1">
                  <span
                    className={cn(
                      "text-xs font-medium tabular",
                      isToday
                        ? "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                        : isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground/60",
                    )}
                  >
                    {date.getDate()}
                  </span>
                </div>

                <div className="space-y-1">
                  {items.map((item) => {
                    const unassigned = item.assignments.length === 0;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelected(item)}
                        className={cn(
                          "w-full rounded-md px-1.5 py-1 text-left text-[11px] leading-tight transition-colors",
                          unassigned
                            ? "bg-warning-soft text-warning hover:brightness-95"
                            : "bg-primary-soft text-accent-foreground hover:brightness-95",
                        )}
                      >
                        <span className="block truncate font-medium">{item.title}</span>
                        <span className="block truncate opacity-80">{item.project.name}</span>
                        <span className="mt-0.5 block opacity-70">
                          {unassigned ? "No crew" : `${item.assignments.length} crew`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <EventDayDialog
        day={selected}
        crew={crew}
        unavailability={unavailability}
        currency={currency}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function EventDayDialog({
  day,
  crew,
  unavailability,
  currency,
  onClose,
}: {
  day: CalendarEventDay | null;
  crew: CrewOption[];
  unavailability: { crewId: string; startDate: string; endDate: string }[];
  currency: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [crewId, setCrewId] = React.useState("");
  const [role, setRole] = React.useState("PHOTOGRAPHER");
  const [fee, setFee] = React.useState("");
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    setCrewId("");
    setFee("");
  }, [day?.id]);

  if (!day) return null;

  const assignedIds = new Set(day.assignments.map((a) => a.crew.id));
  const eventDate = new Date(day.date);

  // Grey out anyone on leave that date so the clash is visible before saving.
  const unavailableIds = new Set(
    unavailability
      .filter((u) => new Date(u.startDate) <= eventDate && new Date(u.endDate) >= eventDate)
      .map((u) => u.crewId),
  );

  const available = crew.filter((c) => !assignedIds.has(c.id));
  const totalFee = day.assignments.reduce((s, a) => s + (a.agreedFee ?? 0), 0);

  function add() {
    if (!crewId) {
      toast.error("Choose a crew member");
      return;
    }
    start(async () => {
      const result = await assignCrewAction(
        day!.id,
        crewId,
        role,
        fee ? Number(fee) : undefined,
      );
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Crew assigned");
      setCrewId("");
      setFee("");
      router.refresh();
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{day.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            <Link href={`/projects/${day.project.id}`} className="hover:text-primary">
              {day.project.name}
            </Link>{" "}
            · {EVENT_TYPE_LABEL[day.eventType] ?? day.eventType} · {formatDate(day.date)}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {day.startTime && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                {day.startTime}
              </span>
            )}
            {day.venue && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {day.venue}
              </span>
            )}
          </div>
        </DialogHeader>

        <DialogBody className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold">
              Crew on this day
              {totalFee > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {formatCurrency(totalFee, currency)} committed
                </span>
              )}
            </h3>

            {day.assignments.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title="Nobody assigned yet"
                description="Add a photographer, cinematographer or assistant below."
                className="py-8"
              />
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {day.assignments.map((a) => {
                  const m = meta(ASSIGNMENT_STATUS, a.status);

                  return (
                    <li key={a.id} className="flex items-center gap-3 py-2.5">
                      <Avatar name={a.crew.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.crew.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {CREW_ROLE_LABEL[a.role] ?? a.role}
                          {a.agreedFee ? ` · ${formatCurrency(a.agreedFee, currency)}` : ""}
                        </p>
                      </div>

                      <NativeSelect
                        className="h-8 w-32 text-xs"
                        defaultValue={a.status}
                        disabled={pending}
                        onChange={(e) =>
                          start(async () => {
                            const result = await updateAssignmentStatusAction(a.id, e.target.value);
                            if (!result?.ok) {
                              toast.error(result?.error ?? "Could not update");
                              return;
                            }
                            router.refresh();
                          })
                        }
                      >
                        {Object.entries(ASSIGNMENT_STATUS).map(([value, option]) => (
                          <option key={value} value={value}>
                            {option.label}
                          </option>
                        ))}
                      </NativeSelect>

                      <Badge variant={m.variant} className="hidden sm:inline-flex">
                        {a.crew.type === "IN_HOUSE" ? "In house" : "Freelance"}
                      </Badge>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove assignment"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            await removeAssignmentAction(a.id);
                            toast.success("Removed from this day");
                            router.refresh();
                            onClose();
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold">Assign crew</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Person" htmlFor="crewId">
                <NativeSelect
                  id="crewId"
                  value={crewId}
                  onChange={(e) => {
                    setCrewId(e.target.value);
                    const found = crew.find((c) => c.id === e.target.value);
                    if (found) {
                      setRole(found.role);
                      setFee(found.dayRate ? String(found.dayRate) : "");
                    }
                  }}
                >
                  <option value="">Select…</option>
                  {available.map((c) => (
                    <option key={c.id} value={c.id} disabled={unavailableIds.has(c.id)}>
                      {c.name}
                      {unavailableIds.has(c.id) ? " — unavailable" : ""}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Role" htmlFor="role">
                <NativeSelect id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                  {Object.entries(CREW_ROLE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Fee" htmlFor="fee">
                <Input
                  id="fee"
                  type="number"
                  min={0}
                  step="500"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="12000"
                />
              </Field>
            </div>

            <Button className="mt-3 w-full" onClick={add} disabled={pending || !crewId}>
              {pending ? <Loader2 className="animate-spin" /> : <Plus />}
              Assign to this day
            </Button>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" asChild>
            <Link href={`/projects/${day.project.id}`}>Open project</Link>
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
