import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { DocumentView } from "@/components/public/document-view";
import { prisma } from "@/lib/prisma";
import { INVOICE_STATUS, PAYMENT_METHOD_LABEL, meta } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoice", robots: { index: false } };

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { shareToken: token },
    include: {
      studio: true,
      client: { select: { name: true, email: true, phone: true, city: true } },
      items: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidOn: "desc" } },
    },
  });

  if (!invoice) notFound();

  return (
    <DocumentView
      kind="Invoice"
      number={invoice.number}
      title={invoice.title}
      status={meta(INVOICE_STATUS, invoice.status).label}
      studio={invoice.studio}
      recipient={invoice.client}
      issuedOn={invoice.issueDate}
      dueOn={invoice.dueDate}
      items={invoice.items}
      subtotal={invoice.subtotal}
      discount={invoice.discount}
      taxPercent={invoice.taxPercent}
      taxAmount={invoice.taxAmount}
      total={invoice.total}
      amountPaid={invoice.amountPaid}
      notes={invoice.notes}
      terms={invoice.terms}
    >
      {invoice.payments.length > 0 && (
        <div className="border-t border-border p-8">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Payments received
          </p>
          <ul className="mt-3 divide-y divide-border">
            {invoice.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">
                  {formatDate(p.paidOn)} · {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                  {p.reference ? ` · ${p.reference}` : ""}
                </span>
                <span className="font-medium tabular text-success">
                  {formatCurrency(p.amount, invoice.studio.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DocumentView>
  );
}
