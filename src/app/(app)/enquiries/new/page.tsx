import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { EnquiryForm } from "@/components/enquiries/enquiry-form";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "New enquiry" };

export default async function NewEnquiryPage() {
  const user = await requireUser();

  const owners = await prisma.user.findMany({
    where: { studioId: user.studioId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Link
        href="/enquiries"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to enquiries
      </Link>

      <PageHeader title="New enquiry" description="Capture a lead while the details are fresh." />

      <EnquiryForm owners={owners} values={{ ownerId: user.id }} />
    </div>
  );
}
