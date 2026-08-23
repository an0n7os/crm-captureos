import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Download, ExternalLink, FileText, Pencil } from "lucide-react";

import { EventTimeline, TextBlock } from "@/components/finance/event-timeline";
import { QuotationActions } from "@/components/finance/quotation-actions";
import { QuotationPayments } from "@/components/finance/quotation-payments";
import { QuoteTabs } from "@/components/finance/quote-tabs";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { DetailRow, PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { QUOTATION_STATUS, meta } from "@/lib/status";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Quotation" };

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const currency = user.studio.currency;

  const quotation = await prisma.quotation.findFirst({
    where: { id, studioId: user.studioId },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      enquiry: { select: { id: true, contactName: true, phone: true, email: true } },
      events: {
        orderBy: { sortOrder: "asc" },
        include: { services: { orderBy: { sortOrder: "asc" } } },
      },
      payments: { orderBy: { paidOn: "desc" } },
    },
  });

  if (!quotation) notFound();

  const m = meta(QUOTATION_STATUS, quotation.status);
  const recipient =
    quotation.leadName ?? quotation.client?.name ?? quotation.enquiry?.contactName ?? "—";

  const total = toNumber(quotation.total);
  const paid = toNumber(quotation.amountPaid);
  const balance = total - paid;

  const shareUrl = `/q/${quotation.shareToken}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <Link
        href="/quotations"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to quotations
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={recipient} size="lg" />
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
              {recipient}
              <Badge variant={m.variant}>{m.label}</Badge>
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Quotation {quotation.number} · created {formatDate(quotation.createdAt)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Quotation amount", value: total, tone: "" },
            { label: "Paid", value: paid, tone: "text-success" },
            { label: "Balance", value: balance, tone: balance > 0 ? "text-warning" : "text-success" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-card px-4 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </p>
              <p className={`mt-0.5 text-lg font-semibold tabular ${stat.tone}`}>
                {formatCurrency(stat.value, currency)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" asChild>
          <Link href={`${shareUrl}?print=1`} target="_blank">
            <FileText />
            View PDF
          </Link>
        </Button>

        <Button variant="outline" asChild>
          <Link href={`${shareUrl}?print=1&auto=1`} target="_blank">
            <Download />
            Download
          </Link>
        </Button>

        <Button variant="outline" asChild>
          <Link href={`/quotations/${quotation.id}/edit`}>
            <Pencil />
            Edit quotation
          </Link>
        </Button>

        <QuotationActions id={quotation.id} status={quotation.status} />
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-3">
        <ShareRow token={quotation.shareToken} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold">Event timeline</h2>
            <EventTimeline
              currency={currency}
              showDates={quotation.showDates}
              showPrices
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
                  unitPrice: toNumber(service.unitPrice),
                })),
              }))}
            />
          </Card>

          <QuotationPayments
            quotationId={quotation.id}
            balance={balance}
            currency={currency}
            payments={quotation.payments.map((p) => ({
              id: p.id,
              amount: toNumber(p.amount),
              method: p.method,
              paidOn: p.paidOn.toISOString(),
              reference: p.reference,
            }))}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <QuoteTabs
              deliverables={<TextBlock text={quotation.deliverablesText} />}
              complimentary={<TextBlock text={quotation.complimentaryText} />}
              terms={
                quotation.terms ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {quotation.terms}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No terms added.</p>
                )
              }
            />
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold">Summary</h2>
            <div className="mt-3 divide-y divide-border">
              <DetailRow label="Subtotal">{formatCurrency(quotation.subtotal, currency)}</DetailRow>
              {toNumber(quotation.discount) > 0 && (
                <DetailRow label="Discount">
                  −{formatCurrency(quotation.discount, currency)}
                </DetailRow>
              )}
              {toNumber(quotation.taxPercent) > 0 && (
                <DetailRow label={`Tax (${toNumber(quotation.taxPercent)}%)`}>
                  {formatCurrency(quotation.taxAmount, currency)}
                </DetailRow>
              )}
              <DetailRow label="Grand total">
                <span className="text-base font-semibold">
                  {formatCurrency(total, currency)}
                </span>
              </DetailRow>
              <DetailRow label="Valid until">{formatDate(quotation.validUntil)}</DetailRow>
              {quotation.sentAt && (
                <DetailRow label="Sent">{formatDate(quotation.sentAt)}</DetailRow>
              )}
              {quotation.respondedAt && (
                <DetailRow label="Responded">{formatDate(quotation.respondedAt)}</DetailRow>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold">Contact</h2>
            <p className="mt-3 text-sm font-medium">{recipient}</p>
            <p className="text-sm text-muted-foreground">
              {quotation.client?.email ?? quotation.enquiry?.email ?? ""}
            </p>
            <p className="text-sm text-muted-foreground">
              {quotation.client?.phone ?? quotation.enquiry?.phone ?? ""}
            </p>

            {quotation.enquiry && (
              <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                <Link href={`/enquiries/${quotation.enquiry.id}`}>
                  <ExternalLink />
                  Open enquiry
                </Link>
              </Button>
            )}
          </Card>

          {quotation.notes && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold">Internal note</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {quotation.notes}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/** Absolute URL is built client-side, so this stays a tiny client island. */
function ShareRow({ token }: { token: string }) {
  const path = `/q/${token}`;
  return (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">Share with your client</p>
        <p className="truncate text-sm">{path}</p>
      </div>
      <CopyLinkButton url={path} label="Copy link" />
      <Button variant="outline" size="sm" asChild>
        <Link href={path} target="_blank">
          <ExternalLink />
          Open
        </Link>
      </Button>
    </>
  );
}
