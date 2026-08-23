"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { saveCrewAction } from "@/lib/actions/crew-actions";
import { CREW_ROLE_LABEL } from "@/lib/status";
import type { ActionState } from "@/lib/validators";

export type CrewValues = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  type: string;
  role: string;
  dayRate: string | null;
  skills: string[];
  notes: string | null;
};

function SaveButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {isEdit ? "Save" : "Add to team"}
    </Button>
  );
}

export function CrewDialog({
  crew,
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  crew?: CrewValues;
  children?: React.ReactNode;
  /** Omit both to let the trigger manage its own state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [state, formAction] = useActionState<ActionState, FormData>(saveCrewAction, {});

  React.useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success(crew ? "Team member updated" : "Team member added");
      router.refresh();
    }
  }, [state, crew, router]);

  const err = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{crew ? "Edit team member" : "Add team member"}</DialogTitle>
        </DialogHeader>

        <form action={formAction}>
          {crew && <input type="hidden" name="id" value={crew.id} />}

          <DialogBody className="grid gap-4 sm:grid-cols-2">
            {state.error && (
              <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger sm:col-span-2">
                {state.error}
              </div>
            )}

            <Field label="Name" htmlFor="name" required error={err.name}>
              <Input id="name" name="name" defaultValue={crew?.name ?? ""} placeholder="Rahul Krishnan" required />
            </Field>

            <Field label="Type" htmlFor="type" error={err.type}>
              <NativeSelect id="type" name="type" defaultValue={crew?.type ?? "IN_HOUSE"}>
                <option value="IN_HOUSE">In house</option>
                <option value="FREELANCER">Freelancer</option>
              </NativeSelect>
            </Field>

            <Field label="Primary role" htmlFor="role" error={err.role}>
              <NativeSelect id="role" name="role" defaultValue={crew?.role ?? "PHOTOGRAPHER"}>
                {Object.entries(CREW_ROLE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Day rate" htmlFor="dayRate" error={err.dayRate}>
              <Input
                id="dayRate"
                name="dayRate"
                type="number"
                min={0}
                step="500"
                defaultValue={crew?.dayRate ?? ""}
                placeholder="12000"
              />
            </Field>

            <Field label="Phone" htmlFor="phone" error={err.phone}>
              <Input id="phone" name="phone" defaultValue={crew?.phone ?? ""} placeholder="+91 98470 00000" />
            </Field>

            <Field label="Email" htmlFor="email" error={err.email}>
              <Input id="email" name="email" type="email" defaultValue={crew?.email ?? ""} />
            </Field>

            <Field label="City" htmlFor="city" error={err.city}>
              <Input id="city" name="city" defaultValue={crew?.city ?? ""} placeholder="Kochi" />
            </Field>

            <Field
              label="Skills"
              htmlFor="skills"
              hint="Comma separated."
              error={err.skills}
            >
              <Input
                id="skills"
                name="skills"
                defaultValue={crew?.skills.join(", ") ?? ""}
                placeholder="Candid, Drone, Same-day edit"
              />
            </Field>

            <Field label="Notes" htmlFor="notes" className="sm:col-span-2" error={err.notes}>
              <Textarea id="notes" name="notes" rows={3} defaultValue={crew?.notes ?? ""} />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SaveButton isEdit={Boolean(crew)} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
