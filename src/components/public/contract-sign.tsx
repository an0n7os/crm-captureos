"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { declineContractAction, signContractAction } from "@/lib/actions/portal-auth";

/** Typed-name signature block at the foot of a public contract. */
export function ContractSign({
  token,
  defaultName,
  studioName,
}: {
  token: string;
  defaultName: string;
  studioName: string;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(defaultName);
  const [agreed, setAgreed] = React.useState(false);
  const [pending, start] = React.useTransition();
  const [action, setAction] = React.useState<"sign" | "decline" | null>(null);

  function sign() {
    setAction("sign");
    start(async () => {
      const result = await signContractAction(token, name);
      if (result?.error) {
        setAction(null);
        toast.error(result.error);
        return;
      }
      toast.success("Signed — thank you.");
      router.refresh();
    });
  }

  function decline() {
    setAction("decline");
    start(async () => {
      const result = await declineContractAction(token);
      if (result?.error) {
        setAction(null);
        toast.error(result.error);
        return;
      }
      toast.success("The studio has been notified.");
      router.refresh();
    });
  }

  return (
    <div className="border-t border-border bg-muted/40 p-8">
      <h2 className="text-sm font-semibold">Sign this agreement</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Typing your full name below counts as your signature. {studioName} is notified straight away.
      </p>

      <div className="mt-5 max-w-sm">
        <Field label="Your full name" htmlFor="signer">
          <Input
            id="signer"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="As it should appear on the agreement"
          />
        </Field>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 size-4 rounded border-input accent-[var(--color-primary)]"
        />
        <span className="text-muted-foreground">
          I have read the terms above and agree to them on behalf of the client named in this
          agreement.
        </span>
      </label>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant="success"
          size="lg"
          disabled={pending || !agreed || !name.trim()}
          onClick={sign}
        >
          {pending && action === "sign" ? <Loader2 className="animate-spin" /> : <Check />}
          Sign agreement
        </Button>

        <Button variant="outline" size="lg" disabled={pending} onClick={decline}>
          {pending && action === "decline" ? <Loader2 className="animate-spin" /> : <X />}
          Decline
        </Button>
      </div>
    </div>
  );
}
