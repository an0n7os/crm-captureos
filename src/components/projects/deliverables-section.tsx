"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ExternalLink, Loader2, Package, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import {
  deleteDeliverableAction,
  saveDeliverableAction,
  updateDeliverableStatusAction,
} from "@/lib/actions/project-actions";
import { DELIVERABLE_STATUS, meta } from "@/lib/status";
import { cn, relativeDays } from "@/lib/utils";
import type { ActionState } from "@/lib/validators";

export type DeliverableItem = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  status: string;
  dueDate: string | null;
  deliveryUrl: string | null;
};

export function DeliverablesSection({
  projectId,
  deliverables,
}: {
  projectId: string;
  deliverables: DeliverableItem[];
}) {
  const done = deliverables.filter((d) => d.status === "DELIVERED").length;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Deliverables</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {deliverables.length === 0
              ? "What the client receives."
              : `${done} of ${deliverables.length} delivered`}
          </p>
        </div>
        <DeliverableDialog projectId={projectId}>
          <Button size="sm" variant="outline">
            <Plus />
            Add
          </Button>
        </DeliverableDialog>
      </div>

      {deliverables.length > 0 && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${(done / deliverables.length) * 100}%` }}
          />
        </div>
      )}

      {deliverables.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No deliverables yet"
          description="Add the albums, films and reels this project owes the client."
        />
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {deliverables.map((d) => {
            const m = meta(DELIVERABLE_STATUS, d.status);
            const overdue =
              d.dueDate && d.status !== "DELIVERED" && new Date(d.dueDate) < new Date();

            return (
              <li key={d.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {d.name}
                    {d.quantity > 1 && (
                      <span className="ml-1.5 text-xs text-muted-foreground">×{d.quantity}</span>
                    )}
                  </p>
                  {d.description && (
                    <p className="truncate text-xs text-muted-foreground">{d.description}</p>
                  )}
                  {d.dueDate && (
                    <p className={cn("text-xs", overdue ? "text-danger" : "text-muted-foreground")}>
                      Due {relativeDays(d.dueDate)}
                    </p>
                  )}
                </div>

                {d.deliveryUrl && (
                  <a
                    href={d.deliveryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground transition-colors hover:text-primary"
                    aria-label="Open delivery link"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                )}

                <StatusMenu id={d.id} status={d.status} label={m.label} variant={m.variant} />

                <DeliverableDialog projectId={projectId} deliverable={d}>
                  <Button variant="ghost" size="icon-sm" aria-label="Edit deliverable">
                    <Pencil />
                  </Button>
                </DeliverableDialog>

                <DeleteButton id={d.id} />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function StatusMenu({
  id,
  status,
  label,
  variant,
}: {
  id: string;
  status: string;
  label: string;
  variant: "default" | "primary" | "success" | "warning" | "danger" | "info" | "outline";
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" disabled={pending} className="shrink-0">
          <Badge variant={variant} className={cn("cursor-pointer", pending && "opacity-60")}>
            {label}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(DELIVERABLE_STATUS).map(([value, m]) => (
          <DropdownMenuItem
            key={value}
            disabled={value === status}
            onClick={() =>
              start(async () => {
                const result = await updateDeliverableStatusAction(id, value);
                if (!result?.ok) {
                  toast.error(result?.error ?? "Could not update");
                  return;
                }
                toast.success(`Marked ${m.label.toLowerCase()}`);
                router.refresh();
              })
            }
          >
            {m.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Delete deliverable"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteDeliverableAction(id);
          toast.success("Deliverable removed");
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
      {isEdit ? "Save" : "Add deliverable"}
    </Button>
  );
}

function DeliverableDialog({
  projectId,
  deliverable,
  children,
}: {
  projectId: string;
  deliverable?: DeliverableItem;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(saveDeliverableAction, {});

  React.useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success(deliverable ? "Deliverable updated" : "Deliverable added");
      router.refresh();
    }
  }, [state, deliverable, router]);

  const err = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{deliverable ? "Edit deliverable" : "Add deliverable"}</DialogTitle>
        </DialogHeader>

        <form action={formAction}>
          <input type="hidden" name="projectId" value={projectId} />
          {deliverable && <input type="hidden" name="id" value={deliverable.id} />}

          <DialogBody className="grid gap-4">
            {state.error && (
              <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
                {state.error}
              </div>
            )}

            <Field label="Name" htmlFor="name" required error={err.name}>
              <Input
                id="name"
                name="name"
                defaultValue={deliverable?.name ?? ""}
                placeholder="Premium album"
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Quantity" htmlFor="quantity" error={err.quantity}>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min={1}
                  defaultValue={deliverable?.quantity ?? 1}
                />
              </Field>

              <Field label="Status" htmlFor="status" error={err.status}>
                <NativeSelect id="status" name="status" defaultValue={deliverable?.status ?? "PENDING"}>
                  {Object.entries(DELIVERABLE_STATUS).map(([value, m]) => (
                    <option key={value} value={value}>
                      {m.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <Field label="Due date" htmlFor="dueDate" error={err.dueDate}>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                defaultValue={deliverable?.dueDate ? deliverable.dueDate.slice(0, 10) : ""}
              />
            </Field>

            <Field
              label="Delivery link"
              htmlFor="deliveryUrl"
              hint="Drive, WeTransfer or gallery link shared with the client."
              error={err.deliveryUrl}
            >
              <Input
                id="deliveryUrl"
                name="deliveryUrl"
                defaultValue={deliverable?.deliveryUrl ?? ""}
                placeholder="https://"
              />
            </Field>

            <Field label="Description" htmlFor="description" error={err.description}>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={deliverable?.description ?? ""}
                placeholder="30 sheets, 12×36, leather cover."
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SaveButton isEdit={Boolean(deliverable)} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
