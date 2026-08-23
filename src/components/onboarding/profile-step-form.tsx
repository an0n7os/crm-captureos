"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { saveOnboardingProfileAction, skipOnboardingAction } from "@/lib/actions/onboarding-actions";
import type { ActionState } from "@/lib/validators";

const DIAL_CODES = [
  ["+91", "India"],
  ["+971", "UAE"],
  ["+44", "UK"],
  ["+1", "US / Canada"],
  ["+61", "Australia"],
  ["+65", "Singapore"],
] as const;

function NextButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      Continue
      {!pending && <ArrowRight />}
    </Button>
  );
}

export function ProfileStepForm({
  defaults,
}: {
  defaults: {
    ownerName: string;
    studioName: string;
    avatarUrl: string | null;
    logoUrl: string | null;
  };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveOnboardingProfileAction,
    {},
  );
  const [avatar, setAvatar] = React.useState(defaults.avatarUrl);
  const [logo, setLogo] = React.useState(defaults.logoUrl);

  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="mt-6">
      <Card className="p-6">
        {state.error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {state.error}
          </div>
        )}

        <div className="flex flex-wrap items-start justify-center gap-8">
          <div className="text-center">
            <ImageUpload
              name="avatarUrl"
              value={avatar}
              onChange={setAvatar}
              shape="circle"
              label="Add photo"
            />
            <p className="mt-1 text-xs text-muted-foreground">Profile photo</p>
          </div>

          <div className="text-center">
            <ImageUpload name="logoUrl" value={logo} onChange={setLogo} label="Add logo" />
            <p className="mt-1 text-xs text-muted-foreground">Brand logo</p>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-4">
          <Field label="Your name" htmlFor="ownerName" required error={err.ownerName}>
            <Input
              id="ownerName"
              name="ownerName"
              defaultValue={defaults.ownerName}
              placeholder="Aswin"
              required
            />
          </Field>

          <Field label="Studio name" htmlFor="studioName" required error={err.studioName}>
            <Input
              id="studioName"
              name="studioName"
              defaultValue={defaults.studioName}
              placeholder="Frames & Co."
              required
            />
          </Field>

          <Field
            label="WhatsApp number"
            htmlFor="whatsappNumber"
            required
            hint="Clients and crew reach you here."
            error={err.whatsappNumber}
          >
            <div className="flex gap-2">
              <NativeSelect name="dialCode" defaultValue="+91" className="w-32 shrink-0">
                {DIAL_CODES.map(([code, label]) => (
                  <option key={code} value={code}>
                    {code} {label}
                  </option>
                ))}
              </NativeSelect>
              <Input
                id="whatsappNumber"
                name="whatsappNumber"
                inputMode="tel"
                placeholder="98470 00000"
                required
              />
            </div>
          </Field>

          <Field label="Studio address" htmlFor="addressLine" error={err.addressLine}>
            <Input
              id="addressLine"
              name="addressLine"
              placeholder="Door no, street, area"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="City" htmlFor="city">
              <Input id="city" name="city" placeholder="Kochi" />
            </Field>
            <Field label="State" htmlFor="state">
              <Input id="state" name="state" placeholder="Kerala" />
            </Field>
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between">
          <button
            type="submit"
            formAction={skipOnboardingAction}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Skip for now
          </button>
          <NextButton />
        </div>
      </Card>
    </form>
  );
}
