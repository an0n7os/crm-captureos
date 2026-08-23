"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { deletePaymentAction, recordPaymentAction } from "@/lib/actions/finance-actions";
import { PAYMENT_METHOD_LABEL } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ActionState } from "@/lib/validators";

type PaymentItem = {
  id: string;
  amount: number;
  method: string;
  paidOn: string;
  reference: string | null;
  note: string | null;
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Plus />}
      Record payment
    </Button>
  );
}

export function PaymentPanel({
  invoiceId,
  balance,
  payments,
  currency,
}: {
  invoiceId: string;
  balance: number;
  payments: PaymentItem[];
  currency: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(recordPaymentAction, {});

  React.useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success("Payment recorded");
      router.refresh();
    }
  }, [state, router]);

  const err = state.fieldErrors ?? {};

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Payments</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {payments.length === 0
              ? "Nothing received yet."
              : `${payments.length} ${payments.length === 1 ? "payment" : "payments"} recorded`}
          </p>
        </div>
        {balance > 0 && (
          <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
            <Plus />
            Record payment
          </Button>
        )}
      </div>

      {open && (
        <form action={formAction} className="mt-4 rounded-lg border border-border p-4">
          <input type="hidden" name="invoiceId" value={invoiceId} />

          {state.error && (
            <div className="mb-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
              {state.error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Amount" htmlFor="amount" required error={err.amount}>
              <Input
                id="amount"
                name="amount"
                type="number"
                min={0}
                step="100"
                defaultValue={balance}
                required
              />
            </Field>

            <Field label="Method" htmlFor="method" error={err.method}>
              <NativeSelect id="method" name="method" defaultValue="UPI">
                {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Date" htmlFor="paidOn" error={err.paidOn}>
              <Input
                id="paidOn"
                name="paidOn"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </Field>

            <Field label="Reference" htmlFor="reference" error={err.reference}>
              <Input id="reference" name="reference" placeholder="Advance / UTR" />
            </Field>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SaveButton />
          </div>
        </form>
      )}

      {payments.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Wallet className="size-4" />
          No payments against this invoice yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium tabular">
                  {formatCurrency(p.amount, currency)}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(p.paidOn)}
                  {p.reference ? ` · ${p.reference}` : ""}
                </p>
              </div>
              <DeletePayment id={p.id} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function DeletePayment({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Delete payment"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deletePaymentAction(id);
          toast.success("Payment removed");
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
    </Button>
  );
}
