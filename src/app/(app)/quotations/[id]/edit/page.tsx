import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { ItineraryBuilder } from "@/components/finance/itinerary-builder";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Edit quotation" };

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const studioId = user.studioId;

  const [quotation, enquiries, clients, services] = await Promise.all([
    prisma.quotation.findFirst({
      where: { id, studioId },
      include: {
        events: {
          orderBy: { sortOrder: "asc" },
          include: { services: { orderBy: { sortOrder: "asc" } } },
        },
      },
    }),
    prisma.enquiry.findMany({
      where: { studioId },
      select: { id: true, contactName: true, partnerName: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.client.findMany({
      where: { studioId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.serviceItem.findMany({
      where: { studioId, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  if (!quotation) notFound();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <Link
        href={`/quotations/${quotation.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to quotation
      </Link>

      <PageHeader title="Edit quotation" description={quotation.number} />

      <ItineraryBuilder
        currency={user.studio.currency}
        clients={clients}
        enquiries={enquiries.map((e) => ({
          id: e.id,
          label: e.partnerName ? `${e.contactName} & ${e.partnerName}` : e.contactName,
        }))}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          unitPrice: toNumber(s.unitPrice),
        }))}
        initial={{
          id: quotation.id,
          enquiryId: quotation.enquiryId ?? "",
          clientId: quotation.clientId ?? "",
          leadName: quotation.leadName ?? "",
          title: quotation.title ?? "",
          status: quotation.status,
          pdfTemplate: quotation.pdfTemplate,
          showLeadName: quotation.showLeadName,
          showDates: quotation.showDates,
          validUntil: quotation.validUntil ? quotation.validUntil.toISOString().slice(0, 10) : "",
          discount: toNumber(quotation.discount),
          taxPercent: toNumber(quotation.taxPercent),
          deliverablesText: quotation.deliverablesText ?? "",
          complimentaryText: quotation.complimentaryText ?? "",
          terms: quotation.terms ?? "",
          notes: quotation.notes ?? "",
          events: quotation.events.map((event) => ({
            name: event.name,
            venue: event.venue ?? "",
            date: event.date ? event.date.toISOString().slice(0, 10) : "",
            dateConfirmed: event.dateConfirmed,
            services: event.services.map((service) => ({
              name: service.name,
              quantity: service.quantity,
              unitPrice: toNumber(service.unitPrice),
            })),
          })),
        }}
      />
    </div>
  );
}
