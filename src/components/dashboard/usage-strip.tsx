import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatDate, relativeDays } from "@/lib/utils";

export type UsageTile = {
  label: string;
  value: number;
  limit: number | null;
  href: string;
  secondary?: { label: string; value: number };
};

/** Plan banner shown when the subscription is close to lapsing. */
export function PlanBanner({
  plan,
  renewsAt,
}: {
  plan: string;
  renewsAt: string | null;
}) {
  if (!renewsAt) return null;

  const days = Math.round((+new Date(renewsAt) - Date.now()) / 86_400_000);
  if (days > 30) return null;

  const expired = days < 0;

  return (
    <Card
      className={cn(
        "flex flex-wrap items-center gap-3 p-4",
        expired ? "border-danger/30 bg-danger-soft" : "border-warning/30 bg-warning-soft",
      )}
    >
      <CircleAlert className={cn("size-4 shrink-0", expired ? "text-danger" : "text-warning")} />

      <p className={cn("min-w-0 flex-1 text-sm", expired ? "text-danger" : "text-warning")}>
        {expired
          ? `Your ${plan.toLowerCase()} plan expired on ${formatDate(renewsAt)}.`
          : `Your ${plan.toLowerCase()} plan renews ${relativeDays(renewsAt)} — ${formatDate(renewsAt)}.`}
      </p>

      <Button size="sm" asChild>
        <Link href="/settings/subscription">Renew</Link>
      </Button>
    </Card>
  );
}

/**
 * Usage against plan limits. Hidden entirely until something is close to a
 * limit — the full breakdown lives on the subscription page, and a dashboard
 * that shows six healthy progress bars every day is just noise.
 */
export function UsageStrip({ tiles }: { tiles: UsageTile[] }) {
  const pressured = tiles.filter(
    (tile) => tile.limit !== null && tile.value / tile.limit >= 0.8,
  );
  if (pressured.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {pressured.map((tile) => {
        const ratio = tile.limit ? Math.min(1, tile.value / tile.limit) : 0;
        const nearLimit = tile.limit !== null && ratio >= 0.8;

        return (
          <Link key={tile.label} href={tile.href}>
            <Card className="h-full p-4 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {tile.label}
                </p>
                <Badge variant={tile.limit === null ? "outline" : nearLimit ? "warning" : "outline"}>
                  {tile.limit === null ? "Unlimited" : `of ${tile.limit}`}
                </Badge>
              </div>

              <p className="mt-1.5 text-2xl font-semibold tabular">{tile.value}</p>

              {tile.secondary && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {tile.secondary.value} {tile.secondary.label}
                </p>
              )}

              {tile.limit !== null && (
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      nearLimit ? "bg-warning" : "bg-primary",
                    )}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              )}
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
