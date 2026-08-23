"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Power, UserPlus } from "lucide-react";
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
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { inviteUserAction, toggleUserActiveAction, updateUserRoleAction } from "@/lib/actions/settings-actions";
import { ROLE_LABEL } from "@/lib/status";
import { relativeDays } from "@/lib/utils";
import type { ActionState } from "@/lib/validators";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
};

const ASSIGNABLE_ROLES = ["ADMIN", "MANAGER", "EDITOR", "MEMBER"];

export function UsersPanel({
  users,
  canAdminister,
  currentUserId,
}: {
  users: UserRow[];
  canAdminister: boolean;
  currentUserId: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Users</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            People who can sign in to this workspace.
          </p>
        </div>
        {canAdminister && (
          <InviteDialog>
            <Button size="sm" variant="outline">
              <UserPlus />
              Add user
            </Button>
          </InviteDialog>
        )}
      </div>

      <ul className="mt-4 divide-y divide-border">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
            <Avatar name={u.name} size="sm" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {u.name}
                {u.id === currentUserId && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {u.email}
                {u.lastLoginAt ? ` · last seen ${relativeDays(u.lastLoginAt)}` : " · never signed in"}
              </p>
            </div>

            {!u.isActive && <Badge variant="outline">Disabled</Badge>}

            {canAdminister && u.role !== "OWNER" && u.id !== currentUserId ? (
              <RoleSelect id={u.id} role={u.role} />
            ) : (
              <Badge variant={u.role === "OWNER" ? "primary" : "default"}>
                {ROLE_LABEL[u.role] ?? u.role}
              </Badge>
            )}

            {canAdminister && u.role !== "OWNER" && u.id !== currentUserId && (
              <ToggleActive id={u.id} isActive={u.isActive} />
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RoleSelect({ id, role }: { id: string; role: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <NativeSelect
      className="h-8 w-32 text-xs"
      defaultValue={role}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          const result = await updateUserRoleAction(id, e.target.value);
          if (!result?.ok) {
            toast.error(result?.error ?? "Could not update the role");
            return;
          }
          toast.success("Role updated");
          router.refresh();
        })
      }
    >
      {ASSIGNABLE_ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABEL[r] ?? r}
        </option>
      ))}
    </NativeSelect>
  );
}

function ToggleActive({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={isActive ? "Disable access" : "Enable access"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await toggleUserActiveAction(id);
          if (!result?.ok) {
            toast.error(result?.error ?? "Could not update access");
            return;
          }
          toast.success(isActive ? "Access disabled" : "Access enabled");
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Power />}
    </Button>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      Add user
    </Button>
  );
}

function InviteDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(inviteUserAction, {});

  React.useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success("User added");
      router.refresh();
    }
  }, [state, router]);

  const err = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
        </DialogHeader>

        <form action={formAction}>
          <DialogBody className="grid gap-4">
            {state.error && (
              <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
                {state.error}
              </div>
            )}

            <Field label="Name" htmlFor="u-name" required error={err.name}>
              <Input id="u-name" name="name" placeholder="Nithya Raj" required />
            </Field>

            <Field label="Email" htmlFor="u-email" required error={err.email}>
              <Input id="u-email" name="email" type="email" required />
            </Field>

            <Field
              label="Temporary password"
              htmlFor="u-password"
              required
              hint="Share this with them; they can sign in straight away."
              error={err.password}
            >
              <Input id="u-password" name="password" type="text" minLength={8} required />
            </Field>

            <Field label="Role" htmlFor="u-role" error={err.role}>
              <NativeSelect id="u-role" name="role" defaultValue="MEMBER">
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r] ?? r}
                  </option>
                ))}
              </NativeSelect>
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
