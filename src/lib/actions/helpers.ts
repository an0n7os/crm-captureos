import "server-only";

import { prisma } from "@/lib/prisma";

export async function logActivity(
  studioId: string,
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
) {
  await prisma.activity.create({
    data: { studioId, userId, action, entityType, entityId, summary },
  });
}

/** Next sequential document number for a studio, e.g. INV-0007. */
export async function nextNumber(studioId: string, kind: "invoice" | "quotation" | "project") {
  const prefix = { invoice: "INV", quotation: "QTN", project: "PRJ" }[kind];

  const count =
    kind === "invoice"
      ? await prisma.invoice.count({ where: { studioId } })
      : kind === "quotation"
        ? await prisma.quotation.count({ where: { studioId } })
        : await prisma.project.count({ where: { studioId } });

  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

/** Shared money maths for quotations and invoices. */
export function computeTotals(
  items: { quantity: number; unitPrice: number }[],
  discount: number,
  taxPercent: number,
) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const taxable = Math.max(subtotal - discount, 0);
  const taxAmount = Math.round(taxable * (taxPercent / 100) * 100) / 100;
  return { subtotal, taxAmount, total: taxable + taxAmount };
}

/**
 * Recalculates an invoice's paid amount and status from its payments.
 * Called after any payment is added or removed.
 */
export async function syncInvoiceStatus(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: { select: { amount: true } } },
  });
  if (!invoice) return;

  const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const total = Number(invoice.total);

  let status = invoice.status;
  if (invoice.status !== "DRAFT" && invoice.status !== "CANCELLED") {
    if (paid >= total && total > 0) status = "PAID";
    else if (paid > 0) status = "PARTIAL";
    else if (invoice.dueDate && invoice.dueDate < new Date()) status = "OVERDUE";
    else status = "SENT";
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaid: paid,
      status,
      paidAt: status === "PAID" ? (invoice.paidAt ?? new Date()) : null,
    },
  });
}

/** Keeps a project's denormalised date range in sync with its event days. */
export async function syncProjectDates(projectId: string) {
  const range = await prisma.eventDay.aggregate({
    where: { projectId },
    _min: { date: true },
    _max: { date: true },
  });

  await prisma.project.update({
    where: { id: projectId },
    data: { startDate: range._min.date, endDate: range._max.date },
  });
}
