import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { ItineraryBuilder } from "@/components/finance/itinerary-builder";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "New quotation" };

type SearchParams = Promise<{ enquiryId?: string }>;

export default async function NewQuotationPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const studioId = user.studioId;

  const [enquiries, clients, services, source] = await Promise.all([
    prisma.enquiry.findMany({
      where: { studioId, status: { notIn: ["LOST"] } },
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
    sp.enquiryId
      ? prisma.enquiry.findFirst({
          where: { id: sp.enquiryId, studioId },
          select: {
            id: true,
            contactName: true,
            partnerName: true,
            clientId: true,
            eventDate: true,
            venue: true,
          },
        })
      : null,
  ]);

  const leadName = source
    ? source.partnerName
      ? `${source.contactName} & ${source.partnerName}`
      : source.contactName
    : "";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <Link
        href="/quotations"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to quotations
      </Link>

      <PageHeader
        title="Create quotation"
        description="Build the itinerary event by event, with the crew booked for each day."
      />

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
          enquiryId: source?.id ?? "",
          clientId: source?.clientId ?? "",
          leadName,
          // Seed the first event from what the enquiry already told us.
          events: source
            ? [
                {
                  name: "Wedding",
                  venue: source.venue ?? "",
                  date: source.eventDate ? source.eventDate.toISOString().slice(0, 10) : "",
                  dateConfirmed: false,
                  services: [{ name: "", quantity: 1, unitPrice: 0 }],
                },
              ]
            : undefined,
        }}
      />
    </div>
  );
}
