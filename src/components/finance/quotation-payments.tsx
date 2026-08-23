"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import {
  deleteQuotationPaymentAction,
  recordQuotationPaymentAction,
} from "@/lib/actions/quotation-actions";
import { PAYMENT_METHOD_LABEL } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/utils";

export type QuotationPaymentRow = {
  id: string;
  amount: number;
  method: string;
  paidOn: string;
  reference: string | null;
};

/** Payments taken against a quote, before any invoice is raised. */
export function QuotationPayments({
  quotationId,
  payments,
  balance,
  currency,
}: {
  quotationId: string;
  payments: QuotationPaymentRow[];
  balance: number;
  currency: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(String(Math.max(balance, 0)));
  const [method, setMethod] = React.useState("UPI");
  const [paidOn, setPaidOn] = React.useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = React.useState("");
  const [pending, start] = React.useTransition();

  function submit() {
    start(async () => {
      const result = await recordQuotationPaymentAction(
        quotationId,
        Number(amount),
        method,
        paidOn,
        reference,
      );
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      setReference("");
      toast.success("Payment recorded");
      router.refresh();
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Payment history</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {payments.length === 0
              ? "Nothing collected against this quote yet."
              : `${payments.length} ${payments.length === 1 ? "payment" : "payments"} recorded`}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          <Plus />
          Add payment
        </Button>
      </div>

      {open && (
        <div className="mt-4 grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-4">
          <Field label="Amount" htmlFor="qp-amount">
            <Input
              id="qp-amount"
              type="number"
              min={0}
              step="500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>

          <Field label="Method" htmlFor="qp-method">
            <NativeSelect id="qp-method" value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Date" htmlFor="qp-date">
            <Input
              id="qp-date"
              type="date"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
            />
          </Field>

          <Field label="Reference" htmlFor="qp-ref">
            <Input
              id="qp-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Advance / UTR"
            />
          </Field>

          <div className="flex justify-end gap-2 sm:col-span-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !Number(amount)}>
              {pending && <Loader2 className="animate-spin" />}
              Record payment
            </Button>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Wallet className="size-4" />
          No payments yet.
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
          await deleteQuotationPaymentAction(id);
          toast.success("Payment removed");
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
    </Button>
  );
}
