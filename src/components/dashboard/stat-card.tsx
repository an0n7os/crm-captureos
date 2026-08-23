import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONES = {
  primary: "bg-primary-soft text-accent-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  neutral: "bg-secondary text-muted-foreground",
} as const;

export type Tone = keyof typeof TONES;

export type Metric = {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
};

/**
 * The dashboard's building block: an icon, a title, a "View all" link and a
 * row of metrics, with optional free-form content underneath.
 */
export function StatCard({
  title,
  icon: Icon,
  tone = "primary",
  href,
  metrics,
  children,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: Tone;
  href?: string;
  metrics?: Metric[];
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col p-5", className)}>
      <div className="flex items-center gap-3">
        <span className={cn("flex size-8 items-center justify-center rounded-lg", TONES[tone])}>
          <Icon className="size-4" />
        </span>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>

        {href && (
          <Link
            href={href}
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-75"
          >
            View all
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>

      {metrics && metrics.length > 0 && (
        <dl className="mt-5 grid grid-cols-3 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="min-w-0">
              <dt className="truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {m.label}
              </dt>
              <dd
                className={cn(
                  "mt-1 truncate text-2xl font-semibold tabular",
                  m.tone === "success" && "text-success",
                  m.tone === "warning" && "text-warning",
                  m.tone === "danger" && "text-danger",
                  m.tone === "info" && "text-info",
                  m.tone === "primary" && "text-primary",
                )}
              >
                {m.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {children && <div className="mt-4 flex-1">{children}</div>}
    </Card>
  );
}
