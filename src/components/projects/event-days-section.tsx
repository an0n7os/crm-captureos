"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarDays, Clock, Loader2, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { AvatarGroup } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { deleteEventDayAction, saveEventDayAction } from "@/lib/actions/project-actions";
import { EVENT_TYPE_LABEL } from "@/lib/status";
import { formatDate } from "@/lib/utils";
import type { ActionState } from "@/lib/validators";

export type EventDayItem = {
  id: string;
  title: string;
  eventType: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  venue: string | null;
  city: string | null;
  notes: string | null;
  crewNames: string[];
};

export function EventDaysSection({
  projectId,
  eventDays,
}: {
  projectId: string;
  eventDays: EventDayItem[];
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Event days</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Each day is scheduled and crewed separately.
          </p>
        </div>
        <EventDayDialog projectId={projectId}>
          <Button size="sm" variant="outline">
            <Plus />
            Add day
          </Button>
        </EventDayDialog>
      </div>

      {eventDays.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No event days yet"
          description="Add the haldi, wedding and reception days so you can assign crew to each."
        />
      ) : (
        <ul className="mt-4 space-y-2.5">
          {eventDays.map((day) => (
            <li
              key={day.id}
              className="flex flex-wrap items-start gap-3 rounded-lg border border-border p-3.5"
            >
              <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary">
                <span className="text-base font-semibold leading-none tabular">
                  {new Date(day.date).getDate()}
                </span>
                <span className="mt-0.5 text-[10px] uppercase text-muted-foreground">
                  {new Date(day.date).toLocaleString("en-IN", { month: "short" })}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {day.title}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {EVENT_TYPE_LABEL[day.eventType] ?? day.eventType}
                  </span>
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" />
                    {formatDate(day.date)}
                  </span>
                  {(day.startTime || day.endTime) && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" />
                      {day.startTime ?? "—"} – {day.endTime ?? "—"}
                    </span>
                  )}
                  {day.venue && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {day.venue}
                    </span>
                  )}
                </div>
                {day.notes && <p className="mt-1.5 text-xs text-muted-foreground">{day.notes}</p>}
              </div>

              <div className="flex items-center gap-2">
                {day.crewNames.length > 0 ? (
                  <AvatarGroup names={day.crewNames} />
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-warning">
                    <Users className="size-3.5" />
                    No crew
                  </span>
                )}

                <EventDayDialog projectId={projectId} day={day}>
                  <Button variant="ghost" size="icon-sm" aria-label="Edit day">
                    <Pencil />
                  </Button>
                </EventDayDialog>

                <DeleteDayButton id={day.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function DeleteDayButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Delete day"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteEventDayAction(id);
          toast.success("Event day removed");
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
    </Button>
  );
}

function SaveButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {isEdit ? "Save" : "Add day"}
    </Button>
  );
}

function EventDayDialog({
  projectId,
  day,
  children,
}: {
  projectId: string;
  day?: EventDayItem;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(saveEventDayAction, {});

  // Close and refresh once the server action reports success.
  React.useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success(day ? "Event day updated" : "Event day added");
      router.refresh();
    }
  }, [state, day, router]);

  const err = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{day ? "Edit event day" : "Add event day"}</DialogTitle>
        </DialogHeader>

        <form action={formAction}>
          <input type="hidden" name="projectId" value={projectId} />
          {day && <input type="hidden" name="id" value={day.id} />}

          <DialogBody className="grid gap-4 sm:grid-cols-2">
            {state.error && (
              <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger sm:col-span-2">
                {state.error}
              </div>
            )}

            <Field label="Title" htmlFor="title" required error={err.title}>
              <Input id="title" name="title" defaultValue={day?.title ?? ""} placeholder="Wedding" required />
            </Field>

            <Field label="Event type" htmlFor="eventType" error={err.eventType}>
              <NativeSelect id="eventType" name="eventType" defaultValue={day?.eventType ?? "WEDDING"}>
                {Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Date" htmlFor="date" required error={err.date}>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={day ? day.date.slice(0, 10) : ""}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start" htmlFor="startTime" error={err.startTime}>
                <Input id="startTime" name="startTime" type="time" defaultValue={day?.startTime ?? ""} />
              </Field>
              <Field label="End" htmlFor="endTime" error={err.endTime}>
                <Input id="endTime" name="endTime" type="time" defaultValue={day?.endTime ?? ""} />
              </Field>
            </div>

            <Field label="Venue" htmlFor="venue" error={err.venue}>
              <Input id="venue" name="venue" defaultValue={day?.venue ?? ""} placeholder="Bolgatty Palace" />
            </Field>

            <Field label="City" htmlFor="city" error={err.city}>
              <Input id="city" name="city" defaultValue={day?.city ?? ""} placeholder="Kochi" />
            </Field>

            <Field label="Notes" htmlFor="notes" className="sm:col-span-2" error={err.notes}>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={day?.notes ?? ""}
                placeholder="Call time, parking, contact person on the day."
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SaveButton isEdit={Boolean(day)} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
