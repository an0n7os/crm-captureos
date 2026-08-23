"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, HandCoins, Loader2, Plus, Trash2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TableWrap, TR } from "@/components/ui/table";
import {
  deletePayoutAction,
  markPayoutPaidAction,
  savePayoutAction,
} from "@/lib/actions/finance-actions";
import { PAYMENT_METHOD_LABEL, PAYOUT_STATUS, meta } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ActionState } from "@/lib/validators";

export type PayoutItem = {
  id: string;
  amount: number;
  status: string;
  method: string;
  paidOn: string | null;
  note: string | null;
  crew: { id: string; name: string };
  project: { id: string; name: string } | null;
};

export function PayoutsPanel({
  payouts,
  crew,
  projects,
  currency,
}: {
  payouts: PayoutItem[];
  crew: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  currency: string;
}) {
  const pending = payouts.filter((p) => p.status === "PENDING");
  const pendingTotal = pending.reduce((s, p) => s + p.amount, 0);
  const paidTotal = payouts.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-warning">{formatCurrency(pendingTotal, currency)}</span>{" "}
          pending · {formatCurrency(paidTotal, currency)} paid
        </p>
        <PayoutDialog crew={crew} projects={projects}>
          <Button size="sm">
            <Plus />
            Add payout
          </Button>
        </PayoutDialog>
      </div>

      {payouts.length === 0 ? (
        <Card>
          <EmptyState
            icon={HandCoins}
            title="No payouts yet"
            description="Track what you owe freelancers per project and mark them off as you pay."
          />
        </Card>
      ) : (
        <Card>
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Crew</TH>
                  <TH>Project</TH>
                  <TH>Method</TH>
                  <TH>Paid on</TH>
                  <TH className="text-right">Amount</TH>
                  <TH>Status</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {payouts.map((p) => {
                  const m = meta(PAYOUT_STATUS, p.status);

                  return (
                    <TR key={p.id}>
                      <TD>
                        <span className="flex items-center gap-2.5">
                          <Avatar name={p.crew.name} size="sm" />
                          <span className="text-sm font-medium">{p.crew.name}</span>
                        </span>
                      </TD>
                      <TD className="text-sm">
                        {p.project ? (
                          <Link href={`/projects/${p.project.id}`} className="hover:text-primary">
                            {p.project.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TD>
                      <TD className="text-sm text-muted-foreground">
                        {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                      </TD>
                      <TD className="whitespace-nowrap text-sm">
                        {p.paidOn ? formatDate(p.paidOn) : "—"}
                      </TD>
                      <TD className="whitespace-nowrap text-right text-sm font-medium tabular">
                        {formatCurrency(p.amount, currency)}
                      </TD>
                      <TD>
                        <Badge variant={m.variant}>{m.label}</Badge>
                      </TD>
                      <TD>
                        <span className="flex items-center gap-1">
                          {p.status === "PENDING" && <MarkPaid id={p.id} />}
                          <DeletePayout id={p.id} />
                        </span>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      )}
    </div>
  );
}

function MarkPaid({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Mark as paid"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await markPayoutPaidAction(id);
          if (!result?.ok) {
            toast.error(result?.error ?? "Could not update");
            return;
          }
          toast.success("Marked as paid");
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Check className="text-success" />}
    </Button>
  );
}

function DeletePayout({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Delete payout"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deletePayoutAction(id);
          toast.success("Payout removed");
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
    </Button>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      Save payout
    </Button>
  );
}

function PayoutDialog({
  crew,
  projects,
  children,
}: {
  crew: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(savePayoutAction, {});

  React.useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success("Payout saved");
      router.refresh();
    }
  }, [state, router]);

  const err = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add crew payout</DialogTitle>
        </DialogHeader>

        <form action={formAction}>
          <DialogBody className="grid gap-4">
            {state.error && (
              <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
                {state.error}
              </div>
            )}

            <Field label="Crew member" htmlFor="crewId" required error={err.crewId}>
              <NativeSelect id="crewId" name="crewId" required>
                <option value="">Select…</option>
                {crew.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Project" htmlFor="projectId" error={err.projectId}>
              <NativeSelect id="projectId" name="projectId">
                <option value="">Not linked to a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Amount" htmlFor="amount" required error={err.amount}>
                <Input id="amount" name="amount" type="number" min={0} step="500" required />
              </Field>

              <Field label="Status" htmlFor="status" error={err.status}>
                <NativeSelect id="status" name="status" defaultValue="PENDING">
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                </NativeSelect>
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
            </div>

            <Field label="Note" htmlFor="note" error={err.note}>
              <Textarea id="note" name="note" rows={2} placeholder="Three days, wedding + reception" />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SaveButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
