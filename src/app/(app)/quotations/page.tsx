import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Receipt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TableWrap, TR } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { QUOTATION_STATUS, meta } from "@/lib/status";
import { formatCurrency, formatDate, relativeDays, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Quotations" };

export default async function QuotationsPage() {
  const user = await requireUser();
  const currency = user.studio.currency;

  const quotations = await prisma.quotation.findMany({
    where: { studioId: user.studioId },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { name: true } },
      enquiry: { select: { id: true, contactName: true } },
      _count: { select: { items: true } },
    },
  });

  const accepted = quotations.filter((q) => q.status === "ACCEPTED");
  const sent = quotations.filter((q) => ["SENT", "VIEWED"].includes(q.status));
  const winRate =
    quotations.length > 0 ? Math.round((accepted.length / quotations.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Quotations"
        description="Build a quote from your packages and share it as a link."
        actions={
          <Button asChild>
            <Link href="/quotations/new">
              <Plus />
              New quotation
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Awaiting response", value: String(sent.length) },
          { label: "Accepted", value: String(accepted.length) },
          { label: "Win rate", value: `${winRate}%` },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-1.5 text-2xl font-semibold tabular">{s.value}</p>
          </Card>
        ))}
      </div>

      {quotations.length === 0 ? (
        <Card>
          <EmptyState
            icon={Receipt}
            title="No quotations yet"
            description="Create one from an enquiry and send the client a link they can accept."
            action={
              <Button asChild>
                <Link href="/quotations/new">
                  <Plus />
                  New quotation
                </Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Quotation</TH>
                  <TH>For</TH>
                  <TH>Created</TH>
                  <TH>Valid until</TH>
                  <TH>Items</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {quotations.map((q) => {
                  const m = meta(QUOTATION_STATUS, q.status);
                  const expired =
                    q.validUntil &&
                    q.validUntil < new Date() &&
                    !["ACCEPTED", "REJECTED"].includes(q.status);

                  return (
                    <TR key={q.id}>
                      <TD>
                        <Link href={`/quotations/${q.id}`} className="group block">
                          <span className="block text-sm font-medium group-hover:text-primary">
                            {q.number}
                          </span>
                          {q.title && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {q.title}
                            </span>
                          )}
                        </Link>
                      </TD>
                      <TD className="text-sm">
                        {q.client?.name ?? q.enquiry?.contactName ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TD>
                      <TD className="whitespace-nowrap text-sm">{formatDate(q.createdAt)}</TD>
                      <TD className="whitespace-nowrap text-sm">
                        {q.validUntil ? (
                          <span className={expired ? "text-danger" : ""}>
                            {relativeDays(q.validUntil)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TD>
                      <TD className="text-sm tabular">{q._count.items}</TD>
                      <TD className="whitespace-nowrap text-right text-sm font-medium tabular">
                        {formatCurrency(toNumber(q.total), currency)}
                      </TD>
                      <TD>
                        <Badge variant={m.variant}>{m.label}</Badge>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      )}
    </div>
  );
}
