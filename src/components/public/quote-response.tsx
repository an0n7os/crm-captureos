"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { respondToQuotationAction } from "@/lib/actions/public-actions";

/** Accept / decline controls at the foot of a public quotation. */
export function QuoteResponse({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [choice, setChoice] = React.useState<"ACCEPTED" | "REJECTED" | null>(null);

  function respond(decision: "ACCEPTED" | "REJECTED") {
    setChoice(decision);
    start(async () => {
      const result = await respondToQuotationAction(token, decision);
      if (result?.error) {
        setChoice(null);
        toast.error(result.error);
        return;
      }
      toast.success(
        decision === "ACCEPTED"
          ? "Thank you — the studio has been notified."
          : "Thanks for letting us know.",
      );
      router.refresh();
    });
  }

  return (
    <div className="border-t border-border bg-muted/40 p-8">
      <p className="text-sm font-medium">Happy with this quote?</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Your response is sent to the studio straight away.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="success" disabled={pending} onClick={() => respond("ACCEPTED")}>
          {pending && choice === "ACCEPTED" ? <Loader2 className="animate-spin" /> : <Check />}
          Accept quotation
        </Button>

        <Button variant="outline" disabled={pending} onClick={() => respond("REJECTED")}>
          {pending && choice === "REJECTED" ? <Loader2 className="animate-spin" /> : <X />}
          Decline
        </Button>
      </div>
    </div>
  );
}
