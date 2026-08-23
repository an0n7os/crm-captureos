"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { saveStudioAction } from "@/lib/actions/settings-actions";
import type { ActionState } from "@/lib/validators";

export type StudioValues = {
  name: string;
  logoUrl: string | null;
  whatsappNumber: string | null;
  ownerName: string;
  avatarUrl: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  gstNumber: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  currency: string;
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      Save changes
    </Button>
  );
}

export function StudioProfileForm({
  values,
  canEdit,
}: {
  values: StudioValues;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionState, FormData>(saveStudioAction, {});
  const [logo, setLogo] = React.useState(values.logoUrl);
  const [avatar, setAvatar] = React.useState(values.avatarUrl);

  React.useEffect(() => {
    if (state.ok) {
      toast.success("Studio details saved");
      router.refresh();
    }
  }, [state, router]);

  const err = state.fieldErrors ?? {};

  return (
    <Card className="p-5">
      <div>
        <h2 className="text-sm font-semibold">Studio profile</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Appears on quotations, invoices and the client portal.
        </p>
      </div>

      <form action={formAction} className="mt-4">
        <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
          {state.error && (
            <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger sm:col-span-2">
              {state.error}
            </div>
          )}

          <Field
            label="Profile photo"
            hint="Shown in your sidebar and account menu."
          >
            <ImageUpload
              name="avatarUrl"
              value={avatar}
              onChange={setAvatar}
              shape="circle"
              label="Change photo"
            />
          </Field>

          <Field
            label="Brand logo"
            hint="Shown on your client portal, quotes and invoices."
          >
            <ImageUpload
              name="logoUrl"
              value={logo}
              onChange={setLogo}
              label="Upload logo"
            />
          </Field>

          <Field label="Your name" htmlFor="ownerName" error={err.ownerName}>
            <Input id="ownerName" name="ownerName" defaultValue={values.ownerName} />
          </Field>

          <Field label="Studio name" htmlFor="name" required error={err.name}>
            <Input id="name" name="name" defaultValue={values.name} required />
          </Field>

          <Field label="Currency" htmlFor="currency" error={err.currency}>
            <NativeSelect id="currency" name="currency" defaultValue={values.currency}>
              <option value="INR">INR — Indian rupee</option>
              <option value="USD">USD — US dollar</option>
              <option value="AED">AED — UAE dirham</option>
              <option value="GBP">GBP — Pound sterling</option>
              <option value="EUR">EUR — Euro</option>
            </NativeSelect>
          </Field>

          <Field label="Email" htmlFor="email" error={err.email}>
            <Input id="email" name="email" type="email" defaultValue={values.email ?? ""} />
          </Field>

          <Field label="Phone" htmlFor="phone" error={err.phone}>
            <Input id="phone" name="phone" defaultValue={values.phone ?? ""} />
          </Field>

          <Field label="WhatsApp number" htmlFor="whatsappNumber" error={err.whatsappNumber}>
            <Input
              id="whatsappNumber"
              name="whatsappNumber"
              defaultValue={values.whatsappNumber ?? ""}
              placeholder="+91 98470 00000"
            />
          </Field>

          <Field label="Website" htmlFor="website" error={err.website}>
            <Input id="website" name="website" defaultValue={values.website ?? ""} placeholder="studio.com" />
          </Field>

          <Field label="GSTIN" htmlFor="gstNumber" error={err.gstNumber}>
            <Input id="gstNumber" name="gstNumber" defaultValue={values.gstNumber ?? ""} />
          </Field>

          <Field label="Address" htmlFor="addressLine" className="sm:col-span-2" error={err.addressLine}>
            <Input id="addressLine" name="addressLine" defaultValue={values.addressLine ?? ""} />
          </Field>

          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <Field label="City" htmlFor="city" error={err.city}>
              <Input id="city" name="city" defaultValue={values.city ?? ""} />
            </Field>
            <Field label="State" htmlFor="state" error={err.state}>
              <Input id="state" name="state" defaultValue={values.state ?? ""} />
            </Field>
            <Field label="PIN code" htmlFor="pincode" error={err.pincode}>
              <Input id="pincode" name="pincode" defaultValue={values.pincode ?? ""} />
            </Field>
          </div>
        </fieldset>

        {canEdit ? (
          <div className="mt-4 flex justify-end">
            <SaveButton />
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">
            Only owners and admins can change these settings.
          </p>
        )}
      </form>
    </Card>
  );
}
