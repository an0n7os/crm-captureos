"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { signupAction } from "@/lib/actions/auth-actions";
import type { ActionState } from "@/lib/validators";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      Create studio
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(signupAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {state.error}
        </div>
      )}

      <Field label="Studio name" htmlFor="studioName" required error={state.fieldErrors?.studioName}>
        <Input id="studioName" name="studioName" placeholder="Frames & Co." required />
      </Field>

      <Field label="Your name" htmlFor="name" required error={state.fieldErrors?.name}>
        <Input id="name" name="name" autoComplete="name" placeholder="Aswin" required />
      </Field>

      <Field label="Email" htmlFor="email" required error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@studio.com"
          required
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        required
        hint="At least 8 characters."
        error={state.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
        />
      </Field>

      <SubmitButton />
    </form>
  );
}
