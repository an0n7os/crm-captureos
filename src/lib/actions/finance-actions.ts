"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { computeTotals, logActivity, nextNumber, syncInvoiceStatus } from "@/lib/actions/helpers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  expenseSchema,
  formToObject,
  invoiceSchema,
  paymentSchema,
  payoutSchema,
  quotationSchema,
  zodFieldErrors,
  type ActionState,
} from "@/lib/validators";

import type {
  ExpenseCategory,
  InvoiceStatus,
  PaymentMethod,
  PayoutStatus,
  QuotationStatus,
} from "@/generated/prisma/enums";

// --- Quotations ------------------------------------------------------------

export async function saveQuotationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const studioId = user.studioId;
  const id = String(formData.get("id") ?? "");

  // Repeated inputs need getAll, which formToObject collapses to a single value.
  const raw = {
    ...formToObject(formData),
    itemName: formData.getAll("itemName").map(String),
    itemQty: formData.getAll("itemQty").map(String),
    itemPrice: formData.getAll("itemPrice").map(String),
  };

  const parsed = quotationSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const v = parsed.data;
  if (v.items.length === 0) return { error: "Add at least one line item" };

  const { subtotal, taxAmount, total } = computeTotals(v.items, v.discount, v.taxPercent);

  const status = v.status as QuotationStatus;
  const base = {
    title: v.title ?? null,
    status,
    subtotal,
    discount: v.discount,
    taxPercent: v.taxPercent,
    taxAmount,
    total,
    notes: v.notes ?? null,
    terms: v.terms ?? null,
    validUntil: v.validUntil ?? null,
    sentAt: status === "SENT" ? new Date() : null,
  };

  let quotationId = id;

  if (id) {
    const existing = await prisma.quotation.findFirst({
      where: { id, studioId },
      select: { id: true },
    });
    if (!existing) return { error: "Quotation not found" };

    // Line items are replaced wholesale rather than diffed.
    await prisma.$transaction([
      prisma.quotationItem.deleteMany({ where: { quotationId: id } }),
      prisma.quotation.update({
        where: { id },
        data: {
          ...base,
          enquiryId: v.enquiryId || null,
          clientId: v.clientId || null,
          items: {
            create: v.items.map((item, i) => ({
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.quantity * item.unitPrice,
              sortOrder: i,
            })),
          },
        },
      }),
    ]);
  } else {
    const created = await prisma.quotation.create({
      data: {
        ...base,
        studioId,
        number: await nextNumber(studioId, "quotation"),
        enquiryId: v.enquiryId || null,
        clientId: v.clientId || null,
        items: {
          create: v.items.map((item, i) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
            sortOrder: i,
          })),
        },
      },
    });
    quotationId = created.id;
    await logActivity(studioId, user.id, "quotation.created", "quotation", created.id, `Created ${created.number}`);
  }

  revalidatePath("/quotations");
  redirect(`/quotations/${quotationId}`);
}

export async function updateQuotationStatusAction(id: string, status: string) {
  const user = await requireUser();

  const result = await prisma.quotation.updateMany({
    where: { id, studioId: user.studioId },
    data: {
      status: status as QuotationStatus,
      sentAt: status === "SENT" ? new Date() : undefined,
      respondedAt: status === "ACCEPTED" || status === "REJECTED" ? new Date() : null,
    },
  });
  if (result.count === 0) return { ok: false, error: "Quotation not found" };

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${id}`);
  return { ok: true };
}

export async function deleteQuotationAction(id: string) {
  const user = await requireUser();
  await prisma.quotation.deleteMany({ where: { id, studioId: user.studioId } });

  revalidatePath("/quotations");
  redirect("/quotations");
}

// --- Invoices --------------------------------------------------------------

export async function saveInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const studioId = user.studioId;
  const id = String(formData.get("id") ?? "");

  const raw = {
    ...formToObject(formData),
    itemName: formData.getAll("itemName").map(String),
    itemQty: formData.getAll("itemQty").map(String),
    itemPrice: formData.getAll("itemPrice").map(String),
  };

  const parsed = invoiceSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const v = parsed.data;
  if (v.items.length === 0) return { error: "Add at least one line item" };

  const client = await prisma.client.findFirst({
    where: { id: v.clientId, studioId },
    select: { id: true },
  });
  if (!client) return { fieldErrors: { clientId: "Choose a client from your studio" } };

  const { subtotal, taxAmount, total } = computeTotals(v.items, v.discount, v.taxPercent);

  const base = {
    clientId: v.clientId,
    projectId: v.projectId || null,
    title: v.title ?? null,
    status: v.status as InvoiceStatus,
    subtotal,
    discount: v.discount,
    taxPercent: v.taxPercent,
    taxAmount,
    total,
    issueDate: v.issueDate ?? new Date(),
    dueDate: v.dueDate ?? null,
    notes: v.notes ?? null,
    terms: v.terms ?? null,
  };

  let invoiceId = id;

  if (id) {
    const existing = await prisma.invoice.findFirst({
      where: { id, studioId },
      select: { id: true },
    });
    if (!existing) return { error: "Invoice not found" };

    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
      prisma.invoice.update({
        where: { id },
        data: {
          ...base,
          items: {
            create: v.items.map((item, i) => ({
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.quantity * item.unitPrice,
              sortOrder: i,
            })),
          },
        },
      }),
    ]);
  } else {
    const created = await prisma.invoice.create({
      data: {
        ...base,
        studioId,
        number: await nextNumber(studioId, "invoice"),
        items: {
          create: v.items.map((item, i) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
            sortOrder: i,
          })),
        },
      },
    });
    invoiceId = created.id;
    await logActivity(studioId, user.id, "invoice.created", "invoice", created.id, `Raised ${created.number}`);
  }

  // Recompute status against any existing payments.
  await syncInvoiceStatus(invoiceId);

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  redirect(`/finances/invoices/${invoiceId}`);
}

export async function updateInvoiceStatusAction(id: string, status: string) {
  const user = await requireUser();

  const result = await prisma.invoice.updateMany({
    where: { id, studioId: user.studioId },
    data: { status: status as InvoiceStatus, sentAt: status === "SENT" ? new Date() : undefined },
  });
  if (result.count === 0) return { ok: false, error: "Invoice not found" };

  await syncInvoiceStatus(id);

  revalidatePath("/finances");
  revalidatePath(`/finances/invoices/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteInvoiceAction(id: string) {
  const user = await requireUser();
  await prisma.invoice.deleteMany({ where: { id, studioId: user.studioId } });

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  redirect("/finances");
}

// --- Payments --------------------------------------------------------------

export async function recordPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = paymentSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const v = parsed.data;

  const invoice = await prisma.invoice.findFirst({
    where: { id: v.invoiceId, studioId: user.studioId },
    select: { id: true, number: true },
  });
  if (!invoice) return { error: "Invoice not found" };

  await prisma.payment.create({
    data: {
      studioId: user.studioId,
      invoiceId: v.invoiceId,
      amount: v.amount,
      method: v.method as PaymentMethod,
      paidOn: v.paidOn ?? new Date(),
      reference: v.reference ?? null,
      note: v.note ?? null,
    },
  });

  await syncInvoiceStatus(v.invoiceId);
  await logActivity(
    user.studioId,
    user.id,
    "payment.recorded",
    "invoice",
    v.invoiceId,
    `Recorded a payment against ${invoice.number}`,
  );

  revalidatePath("/finances");
  revalidatePath(`/finances/invoices/${v.invoiceId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deletePaymentAction(id: string) {
  const user = await requireUser();

  const payment = await prisma.payment.findFirst({
    where: { id, studioId: user.studioId },
    select: { invoiceId: true },
  });
  if (!payment) notFound();

  await prisma.payment.delete({ where: { id } });
  await syncInvoiceStatus(payment.invoiceId);

  revalidatePath("/finances");
  revalidatePath(`/finances/invoices/${payment.invoiceId}`);
  revalidatePath("/dashboard");
}

// --- Expenses --------------------------------------------------------------

export async function saveExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const parsed = expenseSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const v = parsed.data;
  const data = {
    title: v.title,
    category: v.category as ExpenseCategory,
    amount: v.amount,
    spentOn: v.spentOn ?? new Date(),
    projectId: v.projectId || null,
    vendor: v.vendor ?? null,
    method: v.method as PaymentMethod,
    note: v.note ?? null,
  };

  if (id) {
    const result = await prisma.expense.updateMany({
      where: { id, studioId: user.studioId },
      data,
    });
    if (result.count === 0) return { error: "Expense not found" };
  } else {
    await prisma.expense.create({ data: { ...data, studioId: user.studioId } });
  }

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  if (v.projectId) revalidatePath(`/projects/${v.projectId}`);
  return { ok: true };
}

export async function deleteExpenseAction(id: string) {
  const user = await requireUser();
  await prisma.expense.deleteMany({ where: { id, studioId: user.studioId } });

  revalidatePath("/finances");
  revalidatePath("/dashboard");
}

// --- Payouts ---------------------------------------------------------------

export async function savePayoutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const parsed = payoutSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const v = parsed.data;
  const status = v.status as PayoutStatus;
  const data = {
    crewId: v.crewId,
    projectId: v.projectId || null,
    amount: v.amount,
    status,
    method: v.method as PaymentMethod,
    paidOn: status === "PAID" ? new Date() : null,
    note: v.note ?? null,
  };

  if (id) {
    const result = await prisma.payout.updateMany({
      where: { id, studioId: user.studioId },
      data,
    });
    if (result.count === 0) return { error: "Payout not found" };
  } else {
    await prisma.payout.create({ data: { ...data, studioId: user.studioId } });
  }

  revalidatePath("/finances");
  revalidatePath("/team");
  return { ok: true };
}

export async function markPayoutPaidAction(id: string) {
  const user = await requireUser();

  const result = await prisma.payout.updateMany({
    where: { id, studioId: user.studioId },
    data: { status: "PAID", paidOn: new Date() },
  });
  if (result.count === 0) return { ok: false, error: "Payout not found" };

  revalidatePath("/finances");
  revalidatePath("/team");
  return { ok: true };
}

export async function deletePayoutAction(id: string) {
  const user = await requireUser();
  await prisma.payout.deleteMany({ where: { id, studioId: user.studioId } });

  revalidatePath("/finances");
  revalidatePath("/team");
}
