"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { LineItemsEditor, type LineItem, type PackageOption } from "@/components/finance/line-items";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { saveQuotationAction } from "@/lib/actions/finance-actions";
import { QUOTATION_STATUS } from "@/lib/status";
import type { ActionState } from "@/lib/validators";

export type QuotationFormValues = {
  id?: string;
  enquiryId?: string | null;
  clientId?: string | null;
  title?: string | null;
  status?: string;
  validUntil?: string;
  discount?: number;
  taxPercent?: number;
  notes?: string | null;
  terms?: string | null;
  items?: LineItem[];
};

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {isEdit ? "Save quotation" : "Create quotation"}
    </Button>
  );
}

export function QuotationForm({
  values = {},
  enquiries,
  clients,
  packages,
  currency,
}: {
  values?: QuotationFormValues;
  enquiries: { id: string; label: string }[];
  clients: { id: string; name: string }[];
  packages: PackageOption[];
  currency: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveQuotationAction, {});
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
        <h2 className="text-sm font-semibold">Quotation details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Enquiry"
            htmlFor="enquiryId"
            hint="Links the quote back to the lead it came from."
            error={err.enquiryId}
          >
            <NativeSelect id="enquiryId" name="enquiryId" defaultValue={values.enquiryId ?? ""}>
              <option value="">Not linked</option>
              {enquiries.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Client" htmlFor="clientId" error={err.clientId}>
            <NativeSelect id="clientId" name="clientId" defaultValue={values.clientId ?? ""}>
              <option value="">Not linked</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Title" htmlFor="title" error={err.title}>
            <Input
              id="title"
              name="title"
              defaultValue={values.title ?? ""}
              placeholder="Wedding coverage — December 2026"
            />
          </Field>

          <Field label="Status" htmlFor="status" error={err.status}>
            <NativeSelect id="status" name="status" defaultValue={values.status ?? "DRAFT"}>
              {Object.entries(QUOTATION_STATUS).map(([value, m]) => (
                <option key={value} value={value}>
                  {m.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Valid until" htmlFor="validUntil" error={err.validUntil}>
            <Input
              id="validUntil"
              name="validUntil"
              type="date"
              defaultValue={values.validUntil ?? ""}
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">What's included</h2>
        <div className="mt-4">
          <LineItemsEditor
            initialItems={values.items}
            initialDiscount={values.discount ?? 0}
            initialTaxPercent={values.taxPercent ?? 0}
            packages={packages}
            currency={currency}
          />
        </div>
      </Card>

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Notes" htmlFor="notes" error={err.notes}>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={values.notes ?? ""}
              placeholder="What the client sees at the bottom of the quote."
            />
          </Field>

          <Field label="Terms" htmlFor="terms" error={err.terms}>
            <Textarea
              id="terms"
              name="terms"
              rows={4}
              defaultValue={values.terms ?? ""}
              placeholder="50% advance to confirm the date. Travel billed at actuals."
            />
          </Field>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={values.id ? `/quotations/${values.id}` : "/quotations"}>Cancel</Link>
        </Button>
        <SubmitButton isEdit={Boolean(values.id)} />
      </div>
    </form>
  );
}
