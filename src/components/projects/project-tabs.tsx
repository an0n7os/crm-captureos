import Link from "next/link";
import { CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Five steps, in the order the work actually happens: agree the details, plan
 * the days, produce the files, get paid, sign. Crew sits with the schedule,
 * moodboard and edits sit with the deliverables, the quote sits with the money.
 */
export const PROJECT_TABS = [
  "overview",
  "schedule",
  "deliverables",
  "money",
  "contract",
] as const;

export type ProjectTab = (typeof PROJECT_TABS)[number];

const LABEL: Record<ProjectTab, string> = {
  overview: "Overview",
  schedule: "Schedule & crew",
  deliverables: "Deliverables",
  money: "Money",
  contract: "Contract",
};

export function normalizeTab(value: string | undefined): ProjectTab {
  return PROJECT_TABS.includes(value as ProjectTab) ? (value as ProjectTab) : "overview";
}

export function ProjectTabs({
  projectId,
  active,
  done,
}: {
  projectId: string;
  active: ProjectTab;
  done: Partial<Record<ProjectTab, boolean>>;
}) {
  return (
    <div className="scrollbar-slim -mb-px overflow-x-auto border-b border-border">
      <nav className="flex min-w-max gap-1">
        {PROJECT_TABS.map((tab) => {
          const isActive = tab === active;

          return (
            <Link
              key={tab}
              href={`/projects/${projectId}?tab=${tab}`}
              scroll={false}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {LABEL[tab]}
              {done[tab] && <CircleCheck className="size-3.5 text-success" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
