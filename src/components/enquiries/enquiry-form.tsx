"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { saveEnquiryAction } from "@/lib/actions/enquiry-actions";
import { ENQUIRY_STATUS, EVENT_TYPE_LABEL, SOURCE_LABEL } from "@/lib/status";
import type { ActionState } from "@/lib/validators";

export type EnquiryFormValues = {
  id?: string;
  contactName?: string;
  partnerName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  eventType?: string;
  eventDate?: string | null;
  venue?: string | null;
  guestCount?: number | null;
  budgetMin?: string | null;
  budgetMax?: string | null;
  status?: string;
  source?: string;
  nextFollowUpAt?: string | null;
  ownerId?: string | null;
  notes?: string | null;
  lostReason?: string | null;
};

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {isEdit ? "Save changes" : "Create enquiry"}
    </Button>
  );
}

export function EnquiryForm({
  values = {},
  owners,
}: {
  values?: EnquiryFormValues;
  owners: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveEnquiryAction, {});
  const isEdit = Boolean(values.id);
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
        <h2 className="text-sm font-semibold">Contact</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Contact name" htmlFor="contactName" required error={err.contactName}>
            <Input
              id="contactName"
              name="contactName"
              defaultValue={values.contactName ?? ""}
              placeholder="Arjun Menon"
              required
            />
          </Field>

          <Field label="Partner name" htmlFor="partnerName" error={err.partnerName}>
            <Input
              id="partnerName"
              name="partnerName"
              defaultValue={values.partnerName ?? ""}
              placeholder="Meera Nair"
            />
          </Field>

          <Field label="Phone" htmlFor="phone" error={err.phone}>
            <Input id="phone" name="phone" defaultValue={values.phone ?? ""} placeholder="+91 98470 00000" />
          </Field>

          <Field label="Email" htmlFor="email" error={err.email}>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={values.email ?? ""}
              placeholder="arjun@example.com"
            />
          </Field>

          <Field label="City" htmlFor="city" error={err.city}>
            <Input id="city" name="city" defaultValue={values.city ?? ""} placeholder="Kochi" />
          </Field>

          <Field label="Source" htmlFor="source" error={err.source}>
            <NativeSelect id="source" name="source" defaultValue={values.source ?? "INSTAGRAM"}>
              {Object.entries(SOURCE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">Event</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Event type" htmlFor="eventType" error={err.eventType}>
            <NativeSelect id="eventType" name="eventType" defaultValue={values.eventType ?? "WEDDING"}>
              {Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Event date" htmlFor="eventDate" error={err.eventDate}>
            <Input id="eventDate" name="eventDate" type="date" defaultValue={values.eventDate ?? ""} />
          </Field>

          <Field label="Venue" htmlFor="venue" error={err.venue}>
            <Input
              id="venue"
              name="venue"
              defaultValue={values.venue ?? ""}
              placeholder="Le Meridien, Kochi"
            />
          </Field>

          <Field label="Guest count" htmlFor="guestCount" error={err.guestCount}>
            <Input
              id="guestCount"
              name="guestCount"
              type="number"
              min={0}
              defaultValue={values.guestCount ?? ""}
              placeholder="500"
            />
          </Field>

          <Field label="Budget from" htmlFor="budgetMin" error={err.budgetMin}>
            <Input
              id="budgetMin"
              name="budgetMin"
              type="number"
              min={0}
              step="1000"
              defaultValue={values.budgetMin ?? ""}
              placeholder="80000"
            />
          </Field>

          <Field label="Budget to" htmlFor="budgetMax" error={err.budgetMax}>
            <Input
              id="budgetMax"
              name="budgetMax"
              type="number"
              min={0}
              step="1000"
              defaultValue={values.budgetMax ?? ""}
              placeholder="150000"
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">Pipeline</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="status" error={err.status}>
            <NativeSelect id="status" name="status" defaultValue={values.status ?? "NEW"}>
              {Object.entries(ENQUIRY_STATUS).map(([value, m]) => (
                <option key={value} value={value}>
                  {m.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="Next follow-up"
            htmlFor="nextFollowUpAt"
            hint="You'll see a reminder on the dashboard."
            error={err.nextFollowUpAt}
          >
            <Input
              id="nextFollowUpAt"
              name="nextFollowUpAt"
              type="date"
              defaultValue={values.nextFollowUpAt ?? ""}
            />
          </Field>

          <Field label="Owner" htmlFor="ownerId" error={err.ownerId}>
            <NativeSelect id="ownerId" name="ownerId" defaultValue={values.ownerId ?? ""}>
              <option value="">Unassigned</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Lost reason" htmlFor="lostReason" hint="Only saved when status is Lost." error={err.lostReason}>
            <Input
              id="lostReason"
              name="lostReason"
              defaultValue={values.lostReason ?? ""}
              placeholder="Budget mismatch"
            />
          </Field>

          <Field label="Notes" htmlFor="notes" className="sm:col-span-2" error={err.notes}>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={values.notes ?? ""}
              placeholder="What did they ask for? Any preferences, references, or concerns."
            />
          </Field>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={values.id ? `/enquiries/${values.id}` : "/enquiries"}>Cancel</Link>
        </Button>
        <SubmitButton isEdit={isEdit} />
      </div>
    </form>
  );
}
