"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const TABS = [
  ["deliverables", "Deliverables"],
  ["complimentary", "Complimentary"],
  ["terms", "Terms"],
] as const;

type TabKey = (typeof TABS)[number][0];

/** Deliverables / Complimentary / Terms switcher used on the quote views. */
export function QuoteTabs({
  deliverables,
  complimentary,
  terms,
}: {
  deliverables: React.ReactNode;
  complimentary: React.ReactNode;
  terms: React.ReactNode;
}) {
  const [tab, setTab] = React.useState<TabKey>("deliverables");

  const content: Record<TabKey, React.ReactNode> = {
    deliverables,
    complimentary,
    terms,
  };

  return (
    <div>
      <div className="flex gap-1 border-b border-border">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "border-b-2 px-3 py-2 text-xs font-medium transition-colors",
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4">{content[tab]}</div>
    </div>
  );
}
