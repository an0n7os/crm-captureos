"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { saveOnboardingBusinessAction } from "@/lib/actions/onboarding-actions";
import type { ActionState } from "@/lib/validators";

function FinishButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
      Finish setup
    </Button>
  );
}

export function BusinessStepForm({ currency }: { currency: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveOnboardingBusinessAction,
    {},
  );
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="mt-6">
      <Card className="p-6">
        {state.error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {state.error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <Field label="Currency" htmlFor="currency" error={err.currency}>
            <NativeSelect id="currency" name="currency" defaultValue={currency}>
              <option value="INR">Indian rupee (₹)</option>
              <option value="USD">US dollar ($)</option>
              <option value="AED">UAE dirham (AED)</option>
              <option value="GBP">Pound sterling (£)</option>
              <option value="EUR">Euro (€)</option>
            </NativeSelect>
          </Field>

          <Field
            label="Typical package price"
            htmlFor="typicalPackage"
            hint="We'll save this as your first package so quotes are one click away."
            error={err.typicalPackage}
          >
            <Input
              id="typicalPackage"
              name="typicalPackage"
              type="number"
              min={0}
              step="1000"
              placeholder="125000"
            />
          </Field>

          <Field
            label="GSTIN"
            htmlFor="gstNumber"
            hint="Optional. Appears on your invoices when set."
            error={err.gstNumber}
          >
            <Input id="gstNumber" name="gstNumber" placeholder="32ABCDE1234F1Z5" />
          </Field>
        </div>

        <div className="mt-7 flex items-center justify-between">
          <Link
            href="/onboarding/profile"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <FinishButton />
        </div>
      </Card>
    </form>
  );
}
