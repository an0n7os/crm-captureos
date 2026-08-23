"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { saveProjectAction } from "@/lib/actions/project-actions";
import { EVENT_TYPE_LABEL, PROJECT_STATUS } from "@/lib/status";
import type { ActionState } from "@/lib/validators";

export type ProjectFormValues = {
  id?: string;
  clientId?: string;
  name?: string;
  eventType?: string;
  status?: string;
  venue?: string | null;
  city?: string | null;
  packageValue?: string;
  managerId?: string | null;
  notes?: string | null;
};

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {isEdit ? "Save changes" : "Create project"}
    </Button>
  );
}

export function ProjectForm({
  values = {},
  clients,
  managers,
}: {
  values?: ProjectFormValues;
  clients: { id: string; name: string }[];
  managers: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveProjectAction, {});
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      {state.error && (
        <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {state.error}
        </div>
      )}

      <Card className="p-5">
        <h2 className="text-sm font-semibold">Project</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Project name" htmlFor="name" required error={err.name}>
            <Input
              id="name"
              name="name"
              defaultValue={values.name ?? ""}
              placeholder="Anand & Lakshmi"
              required
            />
          </Field>

          <Field
            label="Client"
            htmlFor="clientId"
            required
            error={err.clientId}
            hint={clients.length === 0 ? "Add a client first from a won enquiry." : undefined}
          >
            <NativeSelect id="clientId" name="clientId" defaultValue={values.clientId ?? ""} required>
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Event type" htmlFor="eventType" error={err.eventType}>
            <NativeSelect id="eventType" name="eventType" defaultValue={values.eventType ?? "WEDDING"}>
              {Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Status" htmlFor="status" error={err.status}>
            <NativeSelect id="status" name="status" defaultValue={values.status ?? "UPCOMING"}>
              {Object.entries(PROJECT_STATUS).map(([value, m]) => (
                <option key={value} value={value}>
                  {m.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Venue" htmlFor="venue" error={err.venue}>
            <Input
              id="venue"
              name="venue"
              defaultValue={values.venue ?? ""}
              placeholder="Bolgatty Palace"
            />
          </Field>

          <Field label="City" htmlFor="city" error={err.city}>
            <Input id="city" name="city" defaultValue={values.city ?? ""} placeholder="Kochi" />
          </Field>

          <Field
            label="Package value"
            htmlFor="packageValue"
            hint="The agreed amount for this booking."
            error={err.packageValue}
          >
            <Input
              id="packageValue"
              name="packageValue"
              type="number"
              min={0}
              step="1000"
              defaultValue={values.packageValue ?? ""}
              placeholder="240000"
            />
          </Field>

          <Field label="Project manager" htmlFor="managerId" error={err.managerId}>
            <NativeSelect id="managerId" name="managerId" defaultValue={values.managerId ?? ""}>
              <option value="">Unassigned</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Notes" htmlFor="notes" className="sm:col-span-2" error={err.notes}>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={values.notes ?? ""}
              placeholder="Anything the crew and editors should know before the shoot."
            />
          </Field>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={values.id ? `/projects/${values.id}` : "/projects"}>Cancel</Link>
        </Button>
        <SubmitButton isEdit={Boolean(values.id)} />
      </div>
    </form>
  );
}
