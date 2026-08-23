import type { Metadata } from "next";
import { Database, Download } from "lucide-react";

import { IntegrationsPanel } from "@/components/enquiries/integrations-panel";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Data" };

export default async function DataPage() {
  const user = await requireUser();
  const studioId = user.studioId;

  const [enquiries, projects, clients, invoices, expenses] = await Promise.all([
    prisma.enquiry.count({ where: { studioId } }),
    prisma.project.count({ where: { studioId } }),
    prisma.client.count({ where: { studioId } }),
    prisma.invoice.count({ where: { studioId } }),
    prisma.expense.count({ where: { studioId } }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <PageHeader
        title="Data"
        description="Bring your old records in, and take everything out whenever you want."
      />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ["Enquiries", enquiries],
          ["Projects", projects],
          ["Clients", clients],
          ["Invoices", invoices],
          ["Expenses", expenses],
        ].map(([label, count]) => (
          <Card key={label as string} className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {label as string}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular">{count as number}</p>
          </Card>
        ))}
      </div>

      <IntegrationsPanel enquiryCount={enquiries} />

      <Card className="flex items-start gap-3 p-4">
        <Database className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Your data is yours. Every export is a plain CSV that opens in any spreadsheet — nothing is
          locked in. Take a backup before any big change.
        </p>
      </Card>

      <Card className="flex items-start gap-3 border-info/30 bg-info-soft p-4">
        <Download className="mt-0.5 size-4 shrink-0 text-info" />
        <p className="text-sm text-info">
          Want a full database backup instead of CSVs? Run{" "}
          <code className="rounded bg-info/10 px-1 py-0.5 text-xs">pg_dump</code> against your
          Postgres connection string.
        </p>
      </Card>
    </div>
  );
}
