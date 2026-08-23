"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Package, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Field, Input, Textarea } from "@/components/ui/input";
import { deletePackageAction, savePackageAction } from "@/lib/actions/settings-actions";
import { formatCurrency } from "@/lib/utils";
import type { ActionState } from "@/lib/validators";

export type PackageValues = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  inclusions: string[];
};

export function PackagesPanel({
  packages,
  currency,
}: {
  packages: PackageValues[];
  currency: string;
}) {
  const [editing, setEditing] = React.useState<PackageValues | null>(null);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Packages</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Reusable pricing you can drop straight into a quote or invoice.
          </p>
        </div>
        <PackageDialog>
          <Button size="sm" variant="outline">
            <Plus />
            Add package
          </Button>
        </PackageDialog>
      </div>

      {packages.length === 0 ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="size-4" />
          No packages yet.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <div key={p.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular">
                    {formatCurrency(p.price, currency)}
                  </p>
                </div>
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Edit package"
                    onClick={() => setEditing(p)}
                  >
                    <Pencil />
                  </Button>
                  <DeletePackage id={p.id} />
                </div>
              </div>

              {p.inclusions.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {p.inclusions.map((inc) => (
                    <li key={inc} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                      {inc}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <PackageDialog
        pkg={editing ?? undefined}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </Card>
  );
}

function DeletePackage({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Delete package"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deletePackageAction(id);
          toast.success("Package removed");
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
      {isEdit ? "Save" : "Add package"}
    </Button>
  );
}

function PackageDialog({
  pkg,
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  pkg?: PackageValues;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [uncontrolled, setUncontrolled] = React.useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;
  const [state, formAction] = useActionState<ActionState, FormData>(savePackageAction, {});

  React.useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success("Package saved");
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const err = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pkg ? "Edit package" : "Add package"}</DialogTitle>
        </DialogHeader>

        <form action={formAction}>
          {pkg && <input type="hidden" name="id" value={pkg.id} />}

          <DialogBody className="grid gap-4">
            {state.error && (
              <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
                {state.error}
              </div>
            )}

            <Field label="Name" htmlFor="pkg-name" required error={err.name}>
              <Input
                id="pkg-name"
                name="name"
                defaultValue={pkg?.name ?? ""}
                placeholder="Gold — Photo + Video"
                required
              />
            </Field>

            <Field label="Price" htmlFor="pkg-price" required error={err.price}>
              <Input
                id="pkg-price"
                name="price"
                type="number"
                min={0}
                step="1000"
                defaultValue={pkg?.price ?? ""}
                required
              />
            </Field>

            <Field
              label="Inclusions"
              htmlFor="pkg-inclusions"
              hint="One per line."
              error={err.inclusions}
            >
              <Textarea
                id="pkg-inclusions"
                name="inclusions"
                rows={6}
                defaultValue={pkg?.inclusions.join("\n") ?? ""}
                placeholder={"2 photographers\n1 cinematographer\n500 edited photos"}
              />
            </Field>

            <Field label="Description" htmlFor="pkg-description" error={err.description}>
              <Input
                id="pkg-description"
                name="description"
                defaultValue={pkg?.description ?? ""}
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SaveButton isEdit={Boolean(pkg)} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
