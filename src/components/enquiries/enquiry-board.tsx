"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
import { updateEnquiryStatusAction } from "@/lib/actions/enquiry-actions";
import { ENQUIRY_PIPELINE, ENQUIRY_STATUS, EVENT_TYPE_LABEL } from "@/lib/status";
import { cn, formatCompactCurrency, formatDate, relativeDays } from "@/lib/utils";

export type BoardEnquiry = {
  id: string;
  contactName: string;
  partnerName: string | null;
  status: string;
  eventType: string;
  eventDate: string | null;
  venue: string | null;
  budgetMax: number | null;
  nextFollowUpAt: string | null;
  ownerName: string | null;
};

/** Drag-and-drop pipeline. Uses the native HTML5 DnD API — no extra dependency. */
export function EnquiryBoard({
  enquiries,
  currency,
}: {
  enquiries: BoardEnquiry[];
  currency: string;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(enquiries);
  const [dragOver, setDragOver] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => setItems(enquiries), [enquiries]);

  function onDrop(status: string, id: string) {
    setDragOver(null);
    const current = items.find((e) => e.id === id);
    if (!current || current.status === status) return;

    // Optimistic move; reverted if the server rejects it.
    const previous = items;
    setItems((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));

    startTransition(async () => {
      const result = await updateEnquiryStatusAction(id, status);
      if (!result?.ok) {
        setItems(previous);
        toast.error(result?.error ?? "Could not move the enquiry");
        return;
      }
      toast.success(`Moved to ${ENQUIRY_STATUS[status]?.label ?? status}`);
      router.refresh();
    });
  }

  return (
    <div className={cn("scrollbar-slim -mx-1 overflow-x-auto pb-2", pending && "opacity-90")}>
      <div className="flex min-w-max gap-3 px-1">
        {ENQUIRY_PIPELINE.map((status) => {
          const column = items.filter((e) => e.status === status);
          const m = ENQUIRY_STATUS[status];
          const value = column.reduce((sum, e) => sum + (e.budgetMax ?? 0), 0);

          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(status);
              }}
              onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(status, e.dataTransfer.getData("text/plain"));
              }}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-muted/40 transition-colors",
                dragOver === status && "border-primary bg-primary-soft/60",
              )}
            >
              <div className="flex items-center gap-2 px-3 py-3">
                <span className={cn("size-2 rounded-full", dotClass(m.variant))} />
                <span className="text-sm font-medium">{m.label}</span>
                <span className="rounded-md bg-card px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular">
                  {column.length}
                </span>
                {value > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground tabular">
                    {formatCompactCurrency(value, currency)}
                  </span>
                )}
              </div>

              <div className="scrollbar-slim flex max-h-[65vh] flex-col gap-2 overflow-y-auto px-2 pb-2">
                {column.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">Drop here</p>
                ) : (
                  column.map((e) => {
                    const overdue = e.nextFollowUpAt && new Date(e.nextFollowUpAt) < new Date();

                    return (
                      <article
                        key={e.id}
                        draggable
                        onDragStart={(ev) => ev.dataTransfer.setData("text/plain", e.id)}
                        className="cursor-grab rounded-lg border border-border bg-card p-3 shadow-[0_1px_2px_rgba(16,18,32,0.04)] transition-shadow hover:shadow-md active:cursor-grabbing"
                      >
                        <Link href={`/enquiries/${e.id}`} className="block">
                          <p className="truncate text-sm font-medium hover:text-primary">
                            {e.contactName}
                            {e.partnerName ? ` & ${e.partnerName}` : ""}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {EVENT_TYPE_LABEL[e.eventType] ?? e.eventType}
                            {e.budgetMax ? ` · ${formatCompactCurrency(e.budgetMax, currency)}` : ""}
                          </p>

                          {e.eventDate && (
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <CalendarDays className="size-3.5" />
                              {formatDate(e.eventDate)}
                            </p>
                          )}
                          {e.venue && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="size-3.5 shrink-0" />
                              <span className="truncate">{e.venue}</span>
                            </p>
                          )}

                          <div className="mt-3 flex items-center gap-2">
                            {e.ownerName && <Avatar name={e.ownerName} size="sm" />}
                            {e.nextFollowUpAt && (
                              <span
                                className={cn(
                                  "ml-auto rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                                  overdue
                                    ? "bg-danger-soft text-danger"
                                    : "bg-secondary text-muted-foreground",
                                )}
                              >
                                {relativeDays(e.nextFollowUpAt)}
                              </span>
                            )}
                          </div>
                        </Link>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function dotClass(variant: string) {
  switch (variant) {
    case "success":
      return "bg-success";
    case "warning":
      return "bg-warning";
    case "danger":
      return "bg-danger";
    case "info":
      return "bg-info";
    case "primary":
      return "bg-primary";
    default:
      return "bg-muted-foreground";
  }
}
