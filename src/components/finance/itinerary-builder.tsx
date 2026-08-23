"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import {
  saveQuotationAction,
  type ItineraryEvent,
  type QuotationInput,
} from "@/lib/actions/quotation-actions";
import { QUOTATION_STATUS } from "@/lib/status";
import { cn, formatCurrency } from "@/lib/utils";

export type ServiceOption = { id: string; name: string; unitPrice: number };

export const PDF_TEMPLATES = [
  ["CLASSIC", "Classic"],
  ["MINIMAL", "Minimal"],
  ["EDITORIAL", "Editorial"],
] as const;

const emptyService = () => ({ name: "", quantity: 1, unitPrice: 0 });

const emptyEvent = (): ItineraryEvent => ({
  name: "",
  venue: "",
  date: "",
  dateConfirmed: false,
  services: [emptyService()],
});

export function ItineraryBuilder({
  initial,
  services,
  enquiries,
  clients,
  currency,
}: {
  initial: Partial<QuotationInput>;
  services: ServiceOption[];
  enquiries: { id: string; label: string }[];
  clients: { id: string; name: string }[];
  currency: string;
}) {
  const [events, setEvents] = React.useState<ItineraryEvent[]>(
    initial.events && initial.events.length > 0 ? initial.events : [emptyEvent()],
  );
  const [form, setForm] = React.useState({
    enquiryId: initial.enquiryId ?? "",
    clientId: initial.clientId ?? "",
    leadName: initial.leadName ?? "",
    title: initial.title ?? "",
    status: initial.status ?? "DRAFT",
    pdfTemplate: initial.pdfTemplate ?? "CLASSIC",
    showLeadName: initial.showLeadName ?? true,
    showDates: initial.showDates ?? true,
    validUntil: initial.validUntil ?? "",
    discount: initial.discount ?? 0,
    taxPercent: initial.taxPercent ?? 0,
    deliverablesText: initial.deliverablesText ?? "",
    complimentaryText: initial.complimentaryText ?? "",
    terms: initial.terms ?? "",
    notes: initial.notes ?? "",
  });
  const [tab, setTab] = React.useState<"deliverables" | "complimentary" | "terms">(
    "deliverables",
  );
  const [pending, start] = React.useTransition();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function patchEvent(index: number, patch: Partial<ItineraryEvent>) {
    setEvents((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function patchService(
    eventIndex: number,
    serviceIndex: number,
    patch: Partial<ItineraryEvent["services"][number]>,
  ) {
    setEvents((prev) =>
      prev.map((event, i) =>
        i !== eventIndex
          ? event
          : {
              ...event,
              services: event.services.map((service, j) =>
                j === serviceIndex ? { ...service, ...patch } : service,
              ),
            },
      ),
    );
  }

  const subtotal = events.reduce(
    (sum, event) =>
      sum + event.services.reduce((s, service) => s + service.quantity * service.unitPrice, 0),
    0,
  );
  const taxable = Math.max(subtotal - form.discount, 0);
  const taxAmount = Math.round(taxable * (form.taxPercent / 100) * 100) / 100;
  const total = taxable + taxAmount;

  function submit() {
    start(async () => {
      const result = await saveQuotationAction({
        id: initial.id,
        ...form,
        events,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Who it's for */}
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lead name" htmlFor="leadName" hint="Shown at the top of the quote.">
            <Input
              id="leadName"
              value={form.leadName}
              onChange={(e) => set("leadName", e.target.value)}
              placeholder="Anoop & Tony"
            />
          </Field>

          <Field label="PDF template" htmlFor="pdfTemplate">
            <NativeSelect
              id="pdfTemplate"
              value={form.pdfTemplate}
              onChange={(e) => set("pdfTemplate", e.target.value)}
            >
              {PDF_TEMPLATES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Linked enquiry" htmlFor="enquiryId">
            <NativeSelect
              id="enquiryId"
              value={form.enquiryId}
              onChange={(e) => set("enquiryId", e.target.value)}
            >
              <option value="">Not linked</option>
              {enquiries.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Linked client" htmlFor="clientId">
            <NativeSelect
              id="clientId"
              value={form.clientId}
              onChange={(e) => set("clientId", e.target.value)}
            >
              <option value="">Not linked</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-5">
          {[
            ["showLeadName", "Show lead name on the quote"],
            ["showDates", "Show event dates"],
          ].map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form[key as "showLeadName" | "showDates"]}
                onChange={(e) =>
                  set(key as "showLeadName" | "showDates", e.target.checked)
                }
                className="size-4 rounded border-input accent-[var(--color-primary)]"
              />
              {label}
            </label>
          ))}
        </div>
      </Card>

      {/* Itinerary */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Event itinerary</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              One block per shoot day, with the crew booked for it.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {events.map((event, eventIndex) => {
            const eventTotal = event.services.reduce(
              (s, service) => s + service.quantity * service.unitPrice,
              0,
            );

            return (
              <div key={eventIndex} className="rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Event {eventIndex + 1}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm font-medium tabular">
                      {formatCurrency(eventTotal, currency)}
                    </span>
                    <button
                      type="button"
                      disabled={events.length === 1}
                      onClick={() =>
                        setEvents((prev) => prev.filter((_, i) => i !== eventIndex))
                      }
                      className="inline-flex items-center gap-1 text-xs text-danger disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </button>
                  </span>
                </div>

                <div className="grid gap-4 p-4 sm:grid-cols-3">
                  <Field label="Event name" required>
                    <Input
                      value={event.name}
                      onChange={(e) => patchEvent(eventIndex, { name: e.target.value })}
                      placeholder="Betrothal"
                    />
                  </Field>

                  <Field label="Location / venue">
                    <Input
                      value={event.venue}
                      onChange={(e) => patchEvent(eventIndex, { venue: e.target.value })}
                      placeholder="St. Mary's, Kochi"
                    />
                  </Field>

                  <Field label="Event date">
                    <Input
                      type="date"
                      value={event.date}
                      onChange={(e) => patchEvent(eventIndex, { date: e.target.value })}
                    />
                    <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={event.dateConfirmed}
                        onChange={(e) =>
                          patchEvent(eventIndex, { dateConfirmed: e.target.checked })
                        }
                        className="size-3.5 rounded border-input accent-[var(--color-primary)]"
                      />
                      Date confirmed
                    </label>
                  </Field>
                </div>

                <div className="border-t border-border p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Included services
                  </p>

                  <div className="mt-3 flex flex-col gap-2">
                    {event.services.map((service, serviceIndex) => (
                      <div key={serviceIndex} className="flex flex-wrap items-center gap-2">
                        <NativeSelect
                          className="min-w-48 flex-1"
                          value={
                            services.some((s) => s.name === service.name) ? service.name : "__custom"
                          }
                          onChange={(e) => {
                            const picked = services.find((s) => s.name === e.target.value);
                            patchService(eventIndex, serviceIndex, {
                              name: picked ? picked.name : "",
                              unitPrice: picked ? picked.unitPrice : service.unitPrice,
                            });
                          }}
                        >
                          <option value="__custom">Custom…</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </NativeSelect>

                        {!services.some((s) => s.name === service.name) && (
                          <Input
                            className="min-w-40 flex-1"
                            value={service.name}
                            onChange={(e) =>
                              patchService(eventIndex, serviceIndex, { name: e.target.value })
                            }
                            placeholder="Service name"
                          />
                        )}

                        <Input
                          type="number"
                          min={1}
                          className="w-20"
                          value={service.quantity}
                          onChange={(e) =>
                            patchService(eventIndex, serviceIndex, {
                              quantity: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                        />

                        <Input
                          type="number"
                          min={0}
                          step="500"
                          className="w-32"
                          value={service.unitPrice}
                          onChange={(e) =>
                            patchService(eventIndex, serviceIndex, {
                              unitPrice: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                        />

                        <span className="w-28 text-right text-sm font-medium tabular">
                          {formatCurrency(service.quantity * service.unitPrice, currency)}
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove service"
                          disabled={event.services.length === 1}
                          onClick={() =>
                            patchEvent(eventIndex, {
                              services: event.services.filter((_, j) => j !== serviceIndex),
                            })
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() =>
                      patchEvent(eventIndex, { services: [...event.services, emptyService()] })
                    }
                  >
                    <Plus />
                    Add another service
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="secondary"
          className="mt-4 w-full"
          onClick={() => setEvents((prev) => [...prev, emptyEvent()])}
        >
          <Plus />
          Add new event
        </Button>
      </Card>

      {/* Text blocks */}
      <Card className="p-5">
        <div className="flex gap-1 border-b border-border">
          {(["deliverables", "complimentary", "terms"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "border-b-2 px-3.5 py-2.5 text-sm font-medium capitalize transition-colors",
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {key === "terms" ? "Terms & conditions" : key}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === "deliverables" && (
            <Textarea
              rows={9}
              value={form.deliverablesText}
              onChange={(e) => set("deliverablesText", e.target.value)}
              placeholder={"One per line, e.g.\n1 printed album of 70 sheets\n200 edited photos\nHighlight film"}
              className="font-mono text-[13px]"
            />
          )}
          {tab === "complimentary" && (
            <Textarea
              rows={9}
              value={form.complimentaryText}
              onChange={(e) => set("complimentaryText", e.target.value)}
              placeholder={"Free extras you're throwing in, one per line."}
              className="font-mono text-[13px]"
            />
          )}
          {tab === "terms" && (
            <Textarea
              rows={9}
              value={form.terms}
              onChange={(e) => set("terms", e.target.value)}
              placeholder="Advance to confirm the date, balance before delivery, travel at actuals…"
              className="font-mono text-[13px]"
            />
          )}
        </div>
      </Card>

      {/* Totals */}
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Field label="Status" htmlFor="status">
              <NativeSelect
                id="status"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {Object.entries(QUOTATION_STATUS).map(([value, m]) => (
                  <option key={value} value={value}>
                    {m.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Valid until" htmlFor="validUntil">
              <Input
                id="validUntil"
                type="date"
                value={form.validUntil}
                onChange={(e) => set("validUntil", e.target.value)}
              />
            </Field>

            <Field label="Internal note" htmlFor="notes" hint="Only your team sees this.">
              <Textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </div>

          <dl className="space-y-2 self-start rounded-lg border border-border p-4">
            <div className="flex items-center justify-between text-sm">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium tabular">{formatCurrency(subtotal, currency)}</dd>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-muted-foreground">Discount</dt>
              <dd>
                <Input
                  type="number"
                  min={0}
                  step="500"
                  className="h-8 w-28 text-right"
                  value={form.discount}
                  onChange={(e) => set("discount", Math.max(0, Number(e.target.value) || 0))}
                />
              </dd>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-muted-foreground">Tax %</dt>
              <dd>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  className="h-8 w-28 text-right"
                  value={form.taxPercent}
                  onChange={(e) =>
                    set("taxPercent", Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                  }
                />
              </dd>
            </div>

            <div className="flex items-center justify-between text-sm">
              <dt className="text-muted-foreground">Tax amount</dt>
              <dd className="font-medium tabular">{formatCurrency(taxAmount, currency)}</dd>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-2.5 text-lg">
              <dt className="font-semibold">Grand total</dt>
              <dd className="font-semibold tabular">{formatCurrency(total, currency)}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={initial.id ? `/quotations/${initial.id}` : "/quotations"}>Cancel</Link>
        </Button>
        <Button onClick={submit} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {initial.id ? "Save quotation" : "Create quotation"}
        </Button>
      </div>
    </div>
  );
}
