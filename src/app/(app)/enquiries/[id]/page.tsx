import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRightLeft,
  CalendarDays,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Users,
} from "lucide-react";

import { EnquiryStatusBar } from "@/components/enquiries/enquiry-status-bar";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DetailRow, PageHeader } from "@/components/ui/misc";
import { convertEnquiryAction } from "@/lib/actions/enquiry-actions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ENQUIRY_STATUS, EVENT_TYPE_LABEL, SOURCE_LABEL, meta } from "@/lib/status";
import { formatCurrency, formatDate, formatDateTime, relativeDays } from "@/lib/utils";

export const metadata: Metadata = { title: "Enquiry" };

export default async function EnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const currency = user.studio.currency;

  const enquiry = await prisma.enquiry.findFirst({
    where: { id, studioId: user.studioId },
    include: {
      owner: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, code: true } },
      quotations: {
        orderBy: { createdAt: "desc" },
        select: { id: true, number: true, total: true, status: true, createdAt: true },
      },
    },
  });

  if (!enquiry) notFound();

  const m = meta(ENQUIRY_STATUS, enquiry.status);
  const title = enquiry.partnerName
    ? `${enquiry.contactName} & ${enquiry.partnerName}`
    : enquiry.contactName;

  const convert = convertEnquiryAction.bind(null, enquiry.id);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/enquiries"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to enquiries
      </Link>

      <PageHeader
        title={title}
        description={`${EVENT_TYPE_LABEL[enquiry.eventType] ?? enquiry.eventType} · added ${relativeDays(enquiry.createdAt)}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/enquiries/${enquiry.id}/edit`}>
                <Pencil />
                Edit
              </Link>
            </Button>

            {enquiry.project ? (
              <Button asChild>
                <Link href={`/projects/${enquiry.project.id}`}>
                  <ArrowRightLeft />
                  Open project
                </Link>
              </Button>
            ) : (
              <form action={convert}>
                <Button type="submit" variant="success">
                  <ArrowRightLeft />
                  Convert to project
                </Button>
              </form>
            )}
          </>
        }
      />

      <EnquiryStatusBar id={enquiry.id} status={enquiry.status} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Event details</h2>
            <div className="mt-3 divide-y divide-border">
              <DetailRow label="Event type">{EVENT_TYPE_LABEL[enquiry.eventType]}</DetailRow>
              <DetailRow label="Event date">{formatDate(enquiry.eventDate)}</DetailRow>
              <DetailRow label="Venue">{enquiry.venue ?? "—"}</DetailRow>
              <DetailRow label="City">{enquiry.city ?? "—"}</DetailRow>
              <DetailRow label="Guests">{enquiry.guestCount ?? "—"}</DetailRow>
              <DetailRow label="Budget">
                {enquiry.budgetMin || enquiry.budgetMax
                  ? `${formatCurrency(enquiry.budgetMin ?? 0, currency)} – ${formatCurrency(enquiry.budgetMax ?? 0, currency)}`
                  : "—"}
              </DetailRow>
              <DetailRow label="Source">{SOURCE_LABEL[enquiry.source]}</DetailRow>
            </div>
          </Card>

          {enquiry.notes && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold">Notes</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {enquiry.notes}
              </p>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Quotations</h2>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/quotations/new?enquiryId=${enquiry.id}`}>New quotation</Link>
              </Button>
            </div>

            {enquiry.quotations.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No quotation sent yet. Build one from your saved packages.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {enquiry.quotations.map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link
                        href={`/quotations/${q.id}`}
                        className="block truncate text-sm font-medium hover:text-primary"
                      >
                        {q.number}
                      </Link>
                      <p className="text-xs text-muted-foreground">{formatDate(q.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-medium tabular">
                        {formatCurrency(q.total, currency)}
                      </span>
                      <Badge variant="outline">{q.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Contact</h2>
            <div className="mt-4 flex items-center gap-3">
              <Avatar name={enquiry.contactName} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{title}</p>
                <Badge variant={m.variant} className="mt-1">
                  {m.label}
                </Badge>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              {enquiry.phone && (
                <a
                  href={`tel:${enquiry.phone}`}
                  className="flex items-center gap-2.5 text-sm hover:text-primary"
                >
                  <Phone className="size-4 text-muted-foreground" />
                  {enquiry.phone}
                </a>
              )}
              {enquiry.email && (
                <a
                  href={`mailto:${enquiry.email}`}
                  className="flex items-center gap-2.5 text-sm hover:text-primary"
                >
                  <Mail className="size-4 text-muted-foreground" />
                  <span className="truncate">{enquiry.email}</span>
                </a>
              )}
              {enquiry.city && (
                <p className="flex items-center gap-2.5 text-sm">
                  <MapPin className="size-4 text-muted-foreground" />
                  {enquiry.city}
                </p>
              )}
              {enquiry.phone && (
                <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                  <a
                    href={`https://wa.me/${enquiry.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Message on WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold">Pipeline</h2>
            <div className="mt-3 divide-y divide-border">
              <DetailRow label="Owner">
                {enquiry.owner ? (
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={enquiry.owner.name} size="sm" />
                    {enquiry.owner.name}
                  </span>
                ) : (
                  "Unassigned"
                )}
              </DetailRow>
              <DetailRow label="Next follow-up">
                {enquiry.nextFollowUpAt ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 text-muted-foreground" />
                    {formatDate(enquiry.nextFollowUpAt)}
                  </span>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Created">{formatDateTime(enquiry.createdAt)}</DetailRow>
              {enquiry.closedAt && (
                <DetailRow label="Closed">{formatDateTime(enquiry.closedAt)}</DetailRow>
              )}
              {enquiry.lostReason && (
                <DetailRow label="Lost reason">{enquiry.lostReason}</DetailRow>
              )}
            </div>
          </Card>

          {enquiry.client && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold">Client</h2>
              <Link
                href={`/clients/${enquiry.client.id}`}
                className="mt-3 flex items-center gap-2.5 text-sm hover:text-primary"
              >
                <Users className="size-4 text-muted-foreground" />
                {enquiry.client.name}
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
