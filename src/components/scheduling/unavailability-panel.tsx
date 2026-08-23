"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { addUnavailabilityAction, removeUnavailabilityAction } from "@/lib/actions/crew-actions";
import { formatDate } from "@/lib/utils";

export function UnavailabilityPanel({
  crew,
  entries,
}: {
  crew: { id: string; name: string }[];
  entries: {
    id: string;
    crewName: string;
    startDate: string;
    endDate: string;
    reason: string | null;
  }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [crewId, setCrewId] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [pending, start] = React.useTransition();

  function submit() {
    if (!crewId || !startDate) {
      toast.error("Choose a person and a start date");
      return;
    }
    start(async () => {
      const result = await addUnavailabilityAction(crewId, startDate, endDate || startDate, reason);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Marked unavailable");
      setCrewId("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Unavailability</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Leave and blocked dates. Assigning crew on these dates is blocked.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          <Plus />
          Add
        </Button>
      </div>

      {open && (
        <div className="mt-4 grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-4">
          <Field label="Person" htmlFor="u-crew">
            <NativeSelect id="u-crew" value={crewId} onChange={(e) => setCrewId(e.target.value)}>
              <option value="">Select…</option>
              {crew.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="From" htmlFor="u-start">
            <Input
              id="u-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>

          <Field label="To" htmlFor="u-end" hint="Leave blank for a single day.">
            <Input id="u-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>

          <Field label="Reason" htmlFor="u-reason">
            <Input
              id="u-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Personal leave"
            />
          </Field>

          <div className="sm:col-span-4">
            <Button onClick={submit} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarOff className="size-4" />
          Nobody has blocked dates this month.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.crewName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(e.startDate)}
                  {e.endDate !== e.startDate ? ` – ${formatDate(e.endDate)}` : ""}
                  {e.reason ? ` · ${e.reason}` : ""}
                </p>
              </div>
              <RemoveButton id={e.id} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RemoveButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Remove"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await removeUnavailabilityAction(id);
          toast.success("Removed");
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
    </Button>
  );
}
