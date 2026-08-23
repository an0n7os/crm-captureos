import { CalendarDays, Camera, CircleCheck, MapPin } from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";

export type TimelineService = { id: string; name: string; quantity: number; unitPrice?: number };

export type TimelineEvent = {
  id: string;
  name: string;
  venue: string | null;
  date: string | null;
  dateConfirmed: boolean;
  services: TimelineService[];
};

const WEEKDAY = new Intl.DateTimeFormat("en-IN", { weekday: "long" });
const DAY = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * Date-ordered itinerary. Prices are only rendered when `showPrices` is set, so
 * the same component serves the studio view and the client-facing document.
 */
export function EventTimeline({
  events,
  currency,
  showPrices = false,
  showDates = true,
}: {
  events: TimelineEvent[];
  currency: string;
  showPrices?: boolean;
  showDates?: boolean;
}) {
  // Undated events sort last so a half-planned itinerary still reads top to bottom.
  const ordered = [...events].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return +new Date(a.date) - +new Date(b.date);
  });

  return (
    <ol className="flex flex-col gap-5">
      {ordered.map((event) => {
        const date = event.date ? new Date(event.date) : null;

        return (
          <li key={event.id}>
            {showDates && date && (
              <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-primary-soft px-2.5 py-1">
                <CalendarDays className="size-3.5 text-accent-foreground" />
                <span className="text-xs font-semibold text-accent-foreground">
                  {DAY.format(date)}
                </span>
                {event.dateConfirmed && (
                  <CircleCheck className="size-3.5 text-success" aria-label="Date confirmed" />
                )}
              </div>
            )}

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
                <span className="text-sm font-semibold uppercase tracking-wide">{event.name}</span>

                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  {event.venue && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {event.venue}
                    </span>
                  )}
                  {showDates && date && <span>{WEEKDAY.format(date)}</span>}
                </span>
              </div>

              <ul className="divide-y divide-border">
                {event.services.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-muted-foreground">
                    No services listed for this day.
                  </li>
                ) : (
                  event.services.map((service) => (
                    <li key={service.id} className="flex items-center gap-3 px-4 py-2.5">
                      <Camera className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm">{service.name}</span>

                      {showPrices && service.unitPrice !== undefined && (
                        <span className="shrink-0 text-sm tabular text-muted-foreground">
                          {formatCurrency(service.unitPrice, currency)}
                        </span>
                      )}

                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold tabular",
                        )}
                      >
                        {service.quantity}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Renders one of the quote's free-text blocks as a bulleted list. */
export function TextBlock({ text }: { text: string | null }) {
  const lines = (text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing listed here.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {lines.map((line, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm">
          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
          <span className="uppercase tracking-wide text-muted-foreground">{line}</span>
        </li>
      ))}
    </ul>
  );
}
