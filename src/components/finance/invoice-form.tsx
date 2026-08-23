"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { LineItemsEditor, type LineItem, type PackageOption } from "@/components/finance/line-items";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { saveInvoiceAction } from "@/lib/actions/finance-actions";
import { INVOICE_STATUS } from "@/lib/status";
import type { ActionState } from "@/lib/validators";

export type InvoiceFormValues = {
  id?: string;
  clientId?: string;
  projectId?: string | null;
  title?: string | null;
  status?: string;
  issueDate?: string;
  dueDate?: string;
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
      {isEdit ? "Save invoice" : "Create invoice"}
    </Button>
  );
}

export function InvoiceForm({
  values = {},
  clients,
  projects,
  packages,
  currency,
}: {
  values?: InvoiceFormValues;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; clientId: string }[];
  packages: PackageOption[];
  currency: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveInvoiceAction, {});
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
        <h2 className="text-sm font-semibold">Invoice details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Client" htmlFor="clientId" required error={err.clientId}>
            <NativeSelect id="clientId" name="clientId" defaultValue={values.clientId ?? ""} required>
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Project" htmlFor="projectId" error={err.projectId}>
            <NativeSelect id="projectId" name="projectId" defaultValue={values.projectId ?? ""}>
              <option value="">Not linked to a project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Title" htmlFor="title" error={err.title}>
            <Input
              id="title"
              name="title"
              defaultValue={values.title ?? ""}
              placeholder="Wedding coverage — Platinum"
            />
          </Field>

          <Field label="Status" htmlFor="status" error={err.status}>
            <NativeSelect id="status" name="status" defaultValue={values.status ?? "DRAFT"}>
              {Object.entries(INVOICE_STATUS).map(([value, m]) => (
                <option key={value} value={value}>
                  {m.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Issue date" htmlFor="issueDate" error={err.issueDate}>
            <Input
              id="issueDate"
              name="issueDate"
              type="date"
              defaultValue={values.issueDate ?? new Date().toISOString().slice(0, 10)}
            />
          </Field>

          <Field label="Due date" htmlFor="dueDate" error={err.dueDate}>
            <Input id="dueDate" name="dueDate" type="date" defaultValue={values.dueDate ?? ""} />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">Line items</h2>
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
              placeholder="Visible to the client on the invoice."
            />
          </Field>

          <Field label="Terms" htmlFor="terms" error={err.terms}>
            <Textarea
              id="terms"
              name="terms"
              rows={4}
              defaultValue={values.terms ?? ""}
              placeholder="50% advance, balance before delivery. Bank details…"
            />
          </Field>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={values.id ? `/finances/invoices/${values.id}` : "/finances"}>Cancel</Link>
        </Button>
        <SubmitButton isEdit={Boolean(values.id)} />
      </div>
    </form>
  );
}
