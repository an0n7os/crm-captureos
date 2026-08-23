import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { InvoiceForm } from "@/components/finance/invoice-form";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const studioId = user.studioId;

  const [invoice, clients, projects, packages] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id, studioId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
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
    prisma.package.findMany({ where: { studioId, isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  if (!invoice) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <Link
        href={`/finances/invoices/${invoice.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to invoice
      </Link>

      <PageHeader title="Edit invoice" description={invoice.number} />

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
          id: invoice.id,
          clientId: invoice.clientId,
          projectId: invoice.projectId,
          title: invoice.title,
          status: invoice.status,
          issueDate: invoice.issueDate.toISOString().slice(0, 10),
          dueDate: invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : "",
          discount: toNumber(invoice.discount),
          taxPercent: toNumber(invoice.taxPercent),
          notes: invoice.notes,
          terms: invoice.terms,
          items: invoice.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unitPrice: toNumber(i.unitPrice),
          })),
        }}
      />
    </div>
  );
}
