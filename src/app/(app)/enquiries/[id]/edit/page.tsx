import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { EnquiryForm } from "@/components/enquiries/enquiry-form";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Edit enquiry" };

/** `<input type="date">` needs a plain yyyy-mm-dd string. */
function toDateInput(d: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default async function EditEnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const [enquiry, owners] = await Promise.all([
    prisma.enquiry.findFirst({ where: { id, studioId: user.studioId } }),
    prisma.user.findMany({
      where: { studioId: user.studioId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!enquiry) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Link
        href={`/enquiries/${enquiry.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to enquiry
      </Link>

      <PageHeader title="Edit enquiry" description={enquiry.contactName} />

      <EnquiryForm
        owners={owners}
        values={{
          id: enquiry.id,
          contactName: enquiry.contactName,
          partnerName: enquiry.partnerName,
          phone: enquiry.phone,
          email: enquiry.email,
          city: enquiry.city,
          eventType: enquiry.eventType,
          eventDate: toDateInput(enquiry.eventDate),
          venue: enquiry.venue,
          guestCount: enquiry.guestCount,
          budgetMin: enquiry.budgetMin?.toString() ?? "",
          budgetMax: enquiry.budgetMax?.toString() ?? "",
          status: enquiry.status,
          source: enquiry.source,
          nextFollowUpAt: toDateInput(enquiry.nextFollowUpAt),
          ownerId: enquiry.ownerId,
          notes: enquiry.notes,
          lostReason: enquiry.lostReason,
        }}
      />
    </div>
  );
}
