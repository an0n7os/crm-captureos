"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { updateEnquiryStatusAction } from "@/lib/actions/enquiry-actions";
import { ENQUIRY_PIPELINE, ENQUIRY_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Click-through pipeline stepper shown on the enquiry detail page. */
export function EnquiryStatusBar({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [current, setCurrent] = React.useState(status);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => setCurrent(status), [status]);

  const activeIndex = ENQUIRY_PIPELINE.indexOf(current as (typeof ENQUIRY_PIPELINE)[number]);

  function move(next: string) {
    if (next === current || pending) return;
    const previous = current;
    setCurrent(next);

    startTransition(async () => {
      const result = await updateEnquiryStatusAction(id, next);
      if (!result?.ok) {
        setCurrent(previous);
        toast.error(result?.error ?? "Could not update the status");
        return;
      }
      toast.success(`Moved to ${ENQUIRY_STATUS[next]?.label ?? next}`);
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "scrollbar-slim overflow-x-auto rounded-xl border border-border bg-card p-1.5",
        pending && "opacity-70",
      )}
    >
      <div className="flex min-w-max items-center gap-1">
        {ENQUIRY_PIPELINE.map((step, i) => {
          const m = ENQUIRY_STATUS[step];
          const isCurrent = step === current;
          // "Won" and "Lost" are terminal, so nothing after them counts as done.
          const isDone = activeIndex > i && activeIndex < ENQUIRY_PIPELINE.length;

          return (
            <button
              key={step}
              type="button"
              onClick={() => move(step)}
              disabled={pending}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed",
                isCurrent
                  ? "bg-primary text-primary-foreground"
                  : isDone
                    ? "text-success hover:bg-success-soft"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {isDone && <Check className="size-3.5" />}
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
