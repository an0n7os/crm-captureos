"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { changePlanAction } from "@/lib/actions/settings-actions";
import { PLANS, yearlySavingPercent } from "@/lib/plans";
import { cn, formatCurrency } from "@/lib/utils";

export function PlanPicker({
  currentPlan,
  currency,
}: {
  currentPlan: string;
  currency: string;
}) {
  const router = useRouter();
  const [cycle, setCycle] = React.useState<"monthly" | "yearly">("yearly");
  const [pending, start] = React.useTransition();
  const [target, setTarget] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center">
        <div className="flex rounded-lg border border-border bg-card p-0.5">
          {(["monthly", "yearly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCycle(option)}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-xs font-medium capitalize transition-colors",
                cycle === option
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const price = cycle === "yearly" ? plan.yearly : plan.monthly;
          const saving = yearlySavingPercent(plan);

          return (
            <Card
              key={plan.key}
              className={cn(
                "relative flex flex-col p-5",
                plan.highlight && "border-primary shadow-md",
              )}
            >
              {plan.highlight && (
                <Badge variant="primary" className="absolute -top-2.5 left-5">
                  Most popular
                </Badge>
              )}

              <h3 className="text-sm font-semibold">{plan.name}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{plan.tagline}</p>

              <p className="mt-4 text-3xl font-semibold tabular">
                {price === 0 ? "Free" : formatCurrency(price, currency)}
                {price > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    /{cycle === "yearly" ? "year" : "month"}
                  </span>
                )}
              </p>

              {cycle === "yearly" && saving > 0 && (
                <p className="mt-1 text-xs text-success">Save {saving}% paying yearly</p>
              )}

              <ul className="mt-5 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-6 w-full"
                variant={isCurrent ? "outline" : plan.highlight ? "default" : "secondary"}
                disabled={isCurrent || pending}
                onClick={() => {
                  setTarget(plan.key);
                  start(async () => {
                    const result = await changePlanAction(plan.key);
                    if (!result?.ok) {
                      setTarget(null);
                      toast.error(result?.error ?? "Could not change the plan");
                      return;
                    }
                    toast.success(`Switched to ${plan.name}`);
                    router.refresh();
                  });
                }}
              >
                {pending && target === plan.key && <Loader2 className="animate-spin" />}
                {isCurrent ? "Current plan" : price === 0 ? "Downgrade" : `Choose ${plan.name}`}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
