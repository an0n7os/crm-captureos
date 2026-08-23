import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Pencil, Printer } from "lucide-react";

import { InvoiceActions } from "@/components/finance/invoice-actions";
import { PaymentPanel } from "@/components/finance/payment-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DetailRow, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TableWrap, TR } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { INVOICE_STATUS, meta } from "@/lib/status";
import { formatCurrency, formatDate, relativeDays, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const currency = user.studio.currency;

  const invoice = await prisma.invoice.findFirst({
    where: { id, studioId: user.studioId },
    include: {
      client: true,
      project: { select: { id: true, name: true } },
      items: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidOn: "desc" } },
    },
  });

  if (!invoice) notFound();

  const m = meta(INVOICE_STATUS, invoice.status);
  const total = toNumber(invoice.total);
  const paid = toNumber(invoice.amountPaid);
  const balance = total - paid;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <Link
        href="/finances"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to finances
      </Link>

      <PageHeader
        title={invoice.number}
        description={invoice.title ?? invoice.client.name}
        actions={
          <>
            <InvoiceActions id={invoice.id} status={invoice.status} />
            <Button variant="outline" asChild>
              <Link href={`/finances/invoices/${invoice.id}/edit`}>
                <Pencil />
                Edit
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/i/${invoice.shareToken}`} target="_blank">
                <Printer />
                Client view
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Invoice total", value: total, tone: "" },
          { label: "Received", value: paid, tone: "text-success" },
          { label: "Balance", value: balance, tone: balance > 0 ? "text-warning" : "text-success" },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {s.label}
            </p>
            <p className={`mt-1.5 text-2xl font-semibold tabular ${s.tone}`}>
              {formatCurrency(s.value, currency)}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-sm font-semibold">Line items</h2>
              <Badge variant={m.variant}>{m.label}</Badge>
            </div>

            <TableWrap className="mt-4">
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Item</TH>
                    <TH className="text-right">Qty</TH>
                    <TH className="text-right">Rate</TH>
                    <TH className="text-right">Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {invoice.items.map((item) => (
                    <TR key={item.id}>
                      <TD>
                        <p className="text-sm font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </TD>
                      <TD className="text-right text-sm tabular">{item.quantity}</TD>
                      <TD className="text-right text-sm tabular">
                        {formatCurrency(item.unitPrice, currency)}
                      </TD>
                      <TD className="text-right text-sm font-medium tabular">
                        {formatCurrency(item.amount, currency)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>

            <div className="flex justify-end p-5">
              <dl className="w-full max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular">{formatCurrency(invoice.subtotal, currency)}</dd>
                </div>
                {toNumber(invoice.discount) > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Discount</dt>
                    <dd className="tabular">−{formatCurrency(invoice.discount, currency)}</dd>
                  </div>
                )}
                {toNumber(invoice.taxPercent) > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      Tax ({toNumber(invoice.taxPercent)}%)
                    </dt>
                    <dd className="tabular">{formatCurrency(invoice.taxAmount, currency)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular">{formatCurrency(total, currency)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <PaymentPanel
            invoiceId={invoice.id}
            balance={balance}
            currency={currency}
            payments={invoice.payments.map((p) => ({
              id: p.id,
              amount: toNumber(p.amount),
              method: p.method,
              paidOn: p.paidOn.toISOString(),
              reference: p.reference,
              note: p.note,
            }))}
          />

          {(invoice.notes || invoice.terms) && (
            <Card className="p-5">
              {invoice.notes && (
                <>
                  <h2 className="text-sm font-semibold">Notes</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {invoice.notes}
                  </p>
                </>
              )}
              {invoice.terms && (
                <>
                  <h2 className="mt-4 text-sm font-semibold">Terms</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {invoice.terms}
                  </p>
                </>
              )}
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Billed to</h2>
            <p className="mt-3 text-sm font-medium">{invoice.client.name}</p>
            {invoice.client.email && (
              <p className="text-sm text-muted-foreground">{invoice.client.email}</p>
            )}
            {invoice.client.phone && (
              <p className="text-sm text-muted-foreground">{invoice.client.phone}</p>
            )}
            {invoice.client.city && (
              <p className="text-sm text-muted-foreground">{invoice.client.city}</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold">Details</h2>
            <div className="mt-3 divide-y divide-border">
              <DetailRow label="Issued">{formatDate(invoice.issueDate)}</DetailRow>
              <DetailRow label="Due">
                {invoice.dueDate ? (
                  <span className={balance > 0 && invoice.dueDate < new Date() ? "text-danger" : ""}>
                    {formatDate(invoice.dueDate)} · {relativeDays(invoice.dueDate)}
                  </span>
                ) : (
                  "—"
                )}
              </DetailRow>
              {invoice.project && (
                <DetailRow label="Project">
                  <Link href={`/projects/${invoice.project.id}`} className="hover:text-primary">
                    {invoice.project.name}
                  </Link>
                </DetailRow>
              )}
              {invoice.paidAt && <DetailRow label="Paid on">{formatDate(invoice.paidAt)}</DetailRow>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
