"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Plus, Trash2, TrendingDown } from "lucide-react";
import { toast } from "sonner";

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
import { deleteExpenseAction, saveExpenseAction } from "@/lib/actions/finance-actions";
import { EXPENSE_CATEGORY_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ActionState } from "@/lib/validators";

export type ExpenseItem = {
  id: string;
  title: string;
  category: string;
  amount: number;
  spentOn: string;
  vendor: string | null;
  method: string;
  note: string | null;
  project: { id: string; name: string } | null;
};

export function ExpensesPanel({
  expenses,
  projects,
  currency,
}: {
  expenses: ExpenseItem[];
  projects: { id: string; name: string }[];
  currency: string;
}) {
  // Category totals give a quick read on where the money went.
  const byCategory = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [expenses]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {formatCurrency(total, currency)} across {expenses.length}{" "}
          {expenses.length === 1 ? "entry" : "entries"}
        </p>
        <ExpenseDialog projects={projects}>
          <Button size="sm">
            <Plus />
            Add expense
          </Button>
        </ExpenseDialog>
      </div>

      {byCategory.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {byCategory.map(([category, amount]) => (
            <Card key={category} className="p-4">
              <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {EXPENSE_CATEGORY_LABEL[category] ?? category}
              </p>
              <p className="mt-1 text-lg font-semibold tabular">
                {formatCurrency(amount, currency)}
              </p>
            </Card>
          ))}
        </div>
      )}

      {expenses.length === 0 ? (
        <Card>
          <EmptyState
            icon={TrendingDown}
            title="No expenses recorded"
            description="Track freelancer fees, travel, printing and software so profit stays honest."
          />
        </Card>
      ) : (
        <Card>
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Expense</TH>
                  <TH>Category</TH>
                  <TH>Project</TH>
                  <TH>Date</TH>
                  <TH>Method</TH>
                  <TH className="text-right">Amount</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {expenses.map((e) => (
                  <TR key={e.id}>
                    <TD>
                      <p className="text-sm font-medium">{e.title}</p>
                      {e.vendor && <p className="text-xs text-muted-foreground">{e.vendor}</p>}
                    </TD>
                    <TD>
                      <Badge variant="outline">
                        {EXPENSE_CATEGORY_LABEL[e.category] ?? e.category}
                      </Badge>
                    </TD>
                    <TD className="text-sm">
                      {e.project ? (
                        <Link href={`/projects/${e.project.id}`} className="hover:text-primary">
                          {e.project.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Studio</span>
                      )}
                    </TD>
                    <TD className="whitespace-nowrap text-sm">{formatDate(e.spentOn)}</TD>
                    <TD className="text-sm text-muted-foreground">
                      {PAYMENT_METHOD_LABEL[e.method] ?? e.method}
                    </TD>
                    <TD className="whitespace-nowrap text-right text-sm font-medium tabular text-danger">
                      −{formatCurrency(e.amount, currency)}
                    </TD>
                    <TD>
                      <DeleteExpense id={e.id} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      )}
    </div>
  );
}

function DeleteExpense({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Delete expense"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteExpenseAction(id);
          toast.success("Expense removed");
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
      Save expense
    </Button>
  );
}

export function ExpenseDialog({
  projects,
  defaultProjectId,
  children,
}: {
  projects: { id: string; name: string }[];
  defaultProjectId?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(saveExpenseAction, {});

  React.useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success("Expense saved");
      router.refresh();
    }
  }, [state, router]);

  const err = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
        </DialogHeader>

        <form action={formAction}>
          <DialogBody className="grid gap-4">
            {state.error && (
              <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
                {state.error}
              </div>
            )}

            <Field label="Title" htmlFor="title" required error={err.title}>
              <Input id="title" name="title" placeholder="Freelancer — cinematographer" required />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Amount" htmlFor="amount" required error={err.amount}>
                <Input id="amount" name="amount" type="number" min={0} step="100" required />
              </Field>

              <Field label="Date" htmlFor="spentOn" error={err.spentOn}>
                <Input
                  id="spentOn"
                  name="spentOn"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </Field>

              <Field label="Category" htmlFor="category" error={err.category}>
                <NativeSelect id="category" name="category" defaultValue="OTHER">
                  {Object.entries(EXPENSE_CATEGORY_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Paid via" htmlFor="method" error={err.method}>
                <NativeSelect id="method" name="method" defaultValue="CASH">
                  {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <Field label="Project" htmlFor="projectId" error={err.projectId}>
              <NativeSelect id="projectId" name="projectId" defaultValue={defaultProjectId ?? ""}>
                <option value="">Studio overhead (no project)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Vendor" htmlFor="vendor" error={err.vendor}>
              <Input id="vendor" name="vendor" placeholder="Who was paid" />
            </Field>

            <Field label="Note" htmlFor="note" error={err.note}>
              <Textarea id="note" name="note" rows={2} />
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
