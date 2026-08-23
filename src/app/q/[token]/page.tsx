import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Camera } from "lucide-react";

import { EventTimeline, TextBlock } from "@/components/finance/event-timeline";
import { AutoPrint, PrintButton } from "@/components/public/print-controls";
import { QuoteResponse } from "@/components/public/quote-response";
import { prisma } from "@/lib/prisma";
import { QUOTATION_STATUS, meta } from "@/lib/status";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Quotation", robots: { index: false } };

type SearchParams = Promise<{ print?: string; auto?: string }>;

export default async function PublicQuotationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: SearchParams;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const printMode = sp.print === "1";

  const quotation = await prisma.quotation.findUnique({
    where: { shareToken: token },
    include: {
      studio: true,
      client: { select: { name: true, email: true, phone: true, city: true } },
      enquiry: { select: { contactName: true, email: true, phone: true, city: true } },
      events: {
        orderBy: { sortOrder: "asc" },
        include: { services: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!quotation) notFound();

  // Opening the link is the first signal the client has seen it.
  if (quotation.status === "SENT" && !printMode) {
    await prisma.quotation.update({ where: { id: quotation.id }, data: { status: "VIEWED" } });
  }

  const studio = quotation.studio;
  const currency = studio.currency;
  const recipient =
    quotation.leadName ?? quotation.client?.name ?? quotation.enquiry?.contactName ?? "Client";
  const contact = quotation.client ?? quotation.enquiry ?? null;

  const total = toNumber(quotation.total);
  const paid = toNumber(quotation.amountPaid);
  const decided = ["ACCEPTED", "REJECTED"].includes(quotation.status);

  const address = [studio.addressLine, studio.city, studio.state, studio.pincode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-dvh bg-background px-4 py-10 print:bg-white print:p-0">
      {sp.auto === "1" && <AutoPrint />}

      <div className="mx-auto w-full max-w-3xl">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm print:rounded-none print:border-0 print:shadow-none">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border p-8">
            <div>
              <div className="flex items-center gap-2.5">
                {studio.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={studio.logoUrl} alt="" className="size-10 rounded-lg object-cover" />
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Camera className="size-5" />
                  </span>
                )}
                <span className="text-lg font-semibold tracking-tight">{studio.name}</span>
              </div>

              <div className="mt-3 space-y-0.5 text-sm text-muted-foreground">
                {address && <p>{address}</p>}
                {studio.phone && <p>{studio.phone}</p>}
                {studio.email && <p>{studio.email}</p>}
                {studio.gstNumber && <p>GSTIN: {studio.gstNumber}</p>}
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Quotation
              </p>
              <p className="mt-0.5 text-2xl font-semibold tracking-tight">{quotation.number}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatDate(quotation.createdAt)}
              </p>
              {quotation.validUntil && (
                <p className="text-sm text-muted-foreground">
                  Valid until {formatDate(quotation.validUntil)}
                </p>
              )}
              <p className="mt-2 inline-flex rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                {meta(QUOTATION_STATUS, quotation.status).label}
              </p>
            </div>
          </div>

          {/* Recipient */}
          {quotation.showLeadName && (
            <div className="border-b border-border p-8 pb-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Prepared for
              </p>
              <p className="mt-1.5 text-xl font-semibold tracking-tight">{recipient}</p>
              <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                {contact?.email && <p>{contact.email}</p>}
                {contact?.phone && <p>{contact.phone}</p>}
              </div>
              {quotation.title && <p className="mt-3 text-sm font-medium">{quotation.title}</p>}
            </div>
          )}

          {/* Itinerary */}
          <div className="p-8">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Event itinerary
            </p>

            <EventTimeline
              currency={currency}
              showDates={quotation.showDates}
              events={quotation.events.map((event) => ({
                id: event.id,
                name: event.name,
                venue: event.venue,
                date: event.date?.toISOString() ?? null,
                dateConfirmed: event.dateConfirmed,
                services: event.services.map((service) => ({
                  id: service.id,
                  name: service.name,
                  quantity: service.quantity,
                })),
              }))}
            />
          </div>

          {/* Deliverables & complimentary */}
          <div className="grid gap-8 border-t border-border p-8 sm:grid-cols-2">
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Deliverables
              </p>
              <TextBlock text={quotation.deliverablesText} />
            </div>

            {quotation.complimentaryText && (
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Complimentary
                </p>
                <TextBlock text={quotation.complimentaryText} />
              </div>
            )}
          </div>

          {/* Money */}
          <div className="flex justify-end border-t border-border p-8">
            <dl className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular">{formatCurrency(quotation.subtotal, currency)}</dd>
              </div>
              {toNumber(quotation.discount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="tabular">−{formatCurrency(quotation.discount, currency)}</dd>
                </div>
              )}
              {toNumber(quotation.taxPercent) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Tax ({toNumber(quotation.taxPercent)}%)
                  </dt>
                  <dd className="tabular">{formatCurrency(quotation.taxAmount, currency)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold">
                <dt>Grand total</dt>
                <dd className="tabular">{formatCurrency(total, currency)}</dd>
              </div>
              {paid > 0 && (
                <>
                  <div className="flex justify-between text-success">
                    <dt>Received</dt>
                    <dd className="tabular">{formatCurrency(paid, currency)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-semibold">
                    <dt>Balance</dt>
                    <dd className="tabular">{formatCurrency(total - paid, currency)}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {(quotation.terms || quotation.notes) && (
            <div className="border-t border-border p-8">
              {quotation.terms && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Terms &amp; conditions
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {quotation.terms}
                  </p>
                </>
              )}
            </div>
          )}

          {!decided && !printMode && <QuoteResponse token={token} />}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 print:hidden">
          <PrintButton />
          <p className="text-center text-xs text-muted-foreground">
            {studio.name}
            {studio.website ? ` · ${studio.website}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
