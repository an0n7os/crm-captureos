import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { InvoiceForm } from "@/components/finance/invoice-form";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "New invoice" };

type SearchParams = Promise<{ projectId?: string; clientId?: string }>;

export default async function NewInvoicePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const studioId = user.studioId;

  const [clients, projects, packages, sourceProject] = await Promise.all([
    prisma.client.findMany({
      where: { studioId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { studioId, status: { notIn: ["CANCELLED"] } },
      select: { id: true, name: true, clientId: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.package.findMany({
      where: { studioId, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    sp.projectId
      ? prisma.project.findFirst({
          where: { id: sp.projectId, studioId },
          select: { id: true, name: true, clientId: true, packageValue: true },
        })
      : null,
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <Link
        href="/finances"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to finances
      </Link>

      <PageHeader title="New invoice" description="Build it from a package or add lines by hand." />

      <InvoiceForm
        clients={clients}
        projects={projects}
        currency={user.studio.currency}
        packages={packages.map((p) => ({
          id: p.id,
          name: p.name,
          price: toNumber(p.price),
          inclusions: p.inclusions,
        }))}
        values={{
          clientId: sourceProject?.clientId ?? sp.clientId ?? "",
          projectId: sourceProject?.id ?? "",
          title: sourceProject ? `${sourceProject.name} — coverage` : "",
          // Seed the first line from the agreed package value.
          items: sourceProject
            ? [
                {
                  name: "Event coverage",
                  quantity: 1,
                  unitPrice: toNumber(sourceProject.packageValue),
                },
              ]
            : undefined,
        }}
      />
    </div>
  );
}
