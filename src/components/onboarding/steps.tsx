import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/** Two-step progress indicator shared by the onboarding screens. */
export function Steps({ current }: { current: 1 | 2 }) {
  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      {[1, 2].map((step) => (
        <div key={step} className="flex items-center gap-2">
          {step > 1 && <span className="h-px w-14 bg-border" />}
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
              step < current && "bg-primary text-primary-foreground",
              step === current && "bg-primary text-primary-foreground",
              step > current && "bg-secondary text-muted-foreground",
            )}
          >
            {step < current ? <Check className="size-3.5" /> : step}
          </span>
        </div>
      ))}
    </div>
  );
}
