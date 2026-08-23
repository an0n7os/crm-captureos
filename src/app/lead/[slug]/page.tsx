import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Camera } from "lucide-react";

import { LeadForm } from "@/components/public/lead-form";
import { DEFAULT_HEADING, DEFAULT_SUBTEXT } from "@/lib/defaults";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const studio = await prisma.studio.findUnique({
    where: { enquirySlug: slug },
    select: { name: true },
  });

  return {
    title: studio ? `Enquire · ${studio.name}` : "Enquire",
    description: DEFAULT_SUBTEXT,
  };
}

export default async function LeadPage({ params }: { params: Params }) {
  const { slug } = await params;

  const studio = await prisma.studio.findUnique({
    where: { enquirySlug: slug },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      phone: true,
      email: true,
      website: true,
      enquiryEnabled: true,
      enquiryCoverUrl: true,
      enquiryHeading: true,
      enquirySubtext: true,
    },
  });

  if (!studio) notFound();

  return (
    <div className="min-h-dvh bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          {studio.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={studio.logoUrl} alt="" className="size-9 rounded-lg object-cover" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Camera className="size-4.5" />
            </span>
          )}
          <span className="text-lg font-semibold tracking-tight">{studio.name}</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {studio.enquiryCoverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={studio.enquiryCoverUrl}
              alt=""
              className="aspect-video w-full object-cover"
            />
          ) : (
            <div className="aspect-video w-full bg-gradient-to-br from-primary/25 via-primary/10 to-transparent" />
          )}

          <div className="p-7">
            <h1 className="text-xl font-semibold tracking-tight">
              {studio.enquiryHeading || DEFAULT_HEADING}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {studio.enquirySubtext || DEFAULT_SUBTEXT}
            </p>

            {studio.enquiryEnabled ? (
              <LeadForm slug={slug} studioId={studio.id} />
            ) : (
              <p className="mt-6 rounded-lg border border-border bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
                We're not taking new enquiries through this form at the moment.
                {studio.phone ? ` Call us on ${studio.phone}.` : ""}
              </p>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {[studio.phone, studio.email, studio.website].filter(Boolean).join(" · ")}
        </p>
      </div>
    </div>
  );
}
