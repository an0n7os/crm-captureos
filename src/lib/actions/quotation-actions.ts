"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { logActivity, nextNumber } from "@/lib/actions/helpers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/validators";

import type { PaymentMethod, QuotationStatus } from "@/generated/prisma/enums";

export type ItineraryService = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export type ItineraryEvent = {
  name: string;
  venue: string;
  date: string;
  dateConfirmed: boolean;
  services: ItineraryService[];
};

export type QuotationInput = {
  id?: string;
  enquiryId?: string;
  clientId?: string;
  leadName?: string;
  title?: string;
  status?: string;
  pdfTemplate?: string;
  showLeadName?: boolean;
  showDates?: boolean;
  validUntil?: string;
  discount?: number;
  taxPercent?: number;
  deliverablesText?: string;
  complimentaryText?: string;
  notes?: string;
  terms?: string;
  events: ItineraryEvent[];
};

/** Itinerary totals: every service line across every event. */
function totalsFor(events: ItineraryEvent[], discount: number, taxPercent: number) {
  const subtotal = events.reduce(
    (sum, event) =>
      sum +
      event.services.reduce(
        (eventSum, service) => eventSum + service.quantity * service.unitPrice,
        0,
      ),
    0,
  );
  const taxable = Math.max(subtotal - discount, 0);
  const taxAmount = Math.round(taxable * (taxPercent / 100) * 100) / 100;
  return { subtotal, taxAmount, total: taxable + taxAmount };
}

function cleanEvents(events: ItineraryEvent[]) {
  return events
    .map((event) => ({
      ...event,
      name: event.name.trim(),
      venue: event.venue.trim(),
      services: event.services
        .map((service) => ({
          name: service.name.trim(),
          quantity: Math.max(1, Math.round(service.quantity) || 1),
          unitPrice: Math.max(0, service.unitPrice || 0),
        }))
        .filter((service) => service.name.length > 0),
    }))
    .filter((event) => event.name.length > 0);
}

export async function saveQuotationAction(input: QuotationInput): Promise<ActionState> {
  const user = await requireUser();
  const studioId = user.studioId;

  const events = cleanEvents(input.events ?? []);
  if (events.length === 0) return { error: "Add at least one event to the itinerary" };
  if (events.every((e) => e.services.length === 0)) {
    return { error: "Add at least one service to an event" };
  }

  const discount = Math.max(0, input.discount ?? 0);
  const taxPercent = Math.min(100, Math.max(0, input.taxPercent ?? 0));
  const { subtotal, taxAmount, total } = totalsFor(events, discount, taxPercent);

  const status = (input.status ?? "DRAFT") as QuotationStatus;

  const base = {
    title: input.title?.trim() || null,
    leadName: input.leadName?.trim() || null,
    showLeadName: input.showLeadName ?? true,
    showDates: input.showDates ?? true,
    pdfTemplate: input.pdfTemplate || "CLASSIC",
    status,
    subtotal,
    discount,
    taxPercent,
    taxAmount,
    total,
    deliverablesText: input.deliverablesText?.trim() || null,
    complimentaryText: input.complimentaryText?.trim() || null,
    notes: input.notes?.trim() || null,
    terms: input.terms?.trim() || null,
    validUntil: input.validUntil ? new Date(input.validUntil) : null,
    sentAt: status === "SENT" ? new Date() : null,
    enquiryId: input.enquiryId || null,
    clientId: input.clientId || null,
  };

  const eventCreate = events.map((event, index) => ({
    name: event.name,
    venue: event.venue || null,
    date: event.date ? new Date(event.date) : null,
    dateConfirmed: event.dateConfirmed,
    sortOrder: index,
    services: {
      create: event.services.map((service, serviceIndex) => ({
        name: service.name,
        quantity: service.quantity,
        unitPrice: service.unitPrice,
        sortOrder: serviceIndex,
      })),
    },
  }));

  let quotationId = input.id ?? "";

  if (input.id) {
    const existing = await prisma.quotation.findFirst({
      where: { id: input.id, studioId },
      select: { id: true },
    });
    if (!existing) return { error: "Quotation not found" };

    // The itinerary is replaced wholesale rather than diffed.
    await prisma.$transaction([
      prisma.quotationEvent.deleteMany({ where: { quotationId: input.id } }),
      prisma.quotation.update({
        where: { id: input.id },
        data: { ...base, events: { create: eventCreate } },
      }),
    ]);
  } else {
    const created = await prisma.quotation.create({
      data: {
        ...base,
        studioId,
        number: await nextNumber(studioId, "quotation"),
        events: { create: eventCreate },
      },
    });
    quotationId = created.id;
    await logActivity(
      studioId,
      user.id,
      "quotation.created",
      "quotation",
      created.id,
      `Created ${created.number}`,
    );
  }

  revalidatePath("/quotations");
  redirect(`/quotations/${quotationId}`);
}

export async function recordQuotationPaymentAction(
  quotationId: string,
  amount: number,
  method: string,
  paidOn: string,
  reference: string,
): Promise<ActionState> {
  const user = await requireUser();

  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter an amount" };

  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, studioId: user.studioId },
    select: { id: true, number: true },
  });
  if (!quotation) return { error: "Quotation not found" };

  await prisma.quotationPayment.create({
    data: {
      studioId: user.studioId,
      quotationId,
      amount,
      method: method as PaymentMethod,
      paidOn: paidOn ? new Date(paidOn) : new Date(),
      reference: reference.trim() || null,
    },
  });

  await syncQuotationPaid(quotationId);
  await logActivity(
    user.studioId,
    user.id,
    "quotation.payment",
    "quotation",
    quotationId,
    `Payment recorded against ${quotation.number}`,
  );

  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/quotations");
  return { ok: true };
}

export async function deleteQuotationPaymentAction(id: string) {
  const user = await requireUser();

  const payment = await prisma.quotationPayment.findFirst({
    where: { id, studioId: user.studioId },
    select: { quotationId: true },
  });
  if (!payment) notFound();

  await prisma.quotationPayment.delete({ where: { id } });
  await syncQuotationPaid(payment.quotationId);

  revalidatePath(`/quotations/${payment.quotationId}`);
}

/** Recomputes the cached paid total from the payment rows. */
async function syncQuotationPaid(quotationId: string) {
  const sum = await prisma.quotationPayment.aggregate({
    where: { quotationId },
    _sum: { amount: true },
  });

  await prisma.quotation.update({
    where: { id: quotationId },
    data: { amountPaid: sum._sum.amount ?? 0 },
  });
}

// --- Service catalogue -----------------------------------------------------

export async function saveServiceItemAction(
  name: string,
  unitPrice: number,
  id?: string,
): Promise<ActionState> {
  const user = await requireUser();

  const clean = name.trim();
  if (!clean) return { error: "Enter a service name" };

  const price = Math.max(0, unitPrice || 0);

  if (id) {
    const result = await prisma.serviceItem.updateMany({
      where: { id, studioId: user.studioId },
      data: { name: clean, unitPrice: price },
    });
    if (result.count === 0) return { error: "Service not found" };
  } else {
    const existing = await prisma.serviceItem.findFirst({
      where: { studioId: user.studioId, name: clean },
      select: { id: true },
    });
    if (existing) return { error: "You already have a service with that name" };

    const count = await prisma.serviceItem.count({ where: { studioId: user.studioId } });
    await prisma.serviceItem.create({
      data: { studioId: user.studioId, name: clean, unitPrice: price, sortOrder: count },
    });
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteServiceItemAction(id: string) {
  const user = await requireUser();
  await prisma.serviceItem.deleteMany({ where: { id, studioId: user.studioId } });
  revalidatePath("/settings");
}
