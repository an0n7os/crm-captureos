import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/utils";

type Row = Record<string, string | number | null | undefined>;

/** Quotes a cell only when it contains a comma, quote or newline. */
function cell(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Row[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => cell(row[h])).join(",")),
  ].join("\n");
}

const date = (value: Date | null | undefined) =>
  value ? value.toISOString().slice(0, 10) : "";

export async function GET(request: Request) {
  const user = await requireUser();
  const studioId = user.studioId;
  const type = new URL(request.url).searchParams.get("type") ?? "enquiries";

  let rows: Row[] = [];

  switch (type) {
    case "enquiries": {
      const records = await prisma.enquiry.findMany({
        where: { studioId },
        orderBy: { createdAt: "desc" },
        include: { owner: { select: { name: true } } },
      });
      rows = records.map((e) => ({
        name: e.contactName,
        partner: e.partnerName,
        phone: e.phone,
        email: e.email,
        city: e.city,
        "event type": e.eventType,
        "event date": date(e.eventDate),
        venue: e.venue,
        guests: e.guestCount,
        "budget min": toNumber(e.budgetMin),
        "budget max": toNumber(e.budgetMax),
        status: e.status,
        source: e.source,
        owner: e.owner?.name,
        "follow up": date(e.nextFollowUpAt),
        notes: e.notes,
        created: date(e.createdAt),
      }));
      break;
    }

    case "projects": {
      const records = await prisma.project.findMany({
        where: { studioId },
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { name: true } },
          manager: { select: { name: true } },
          _count: { select: { deliverables: true, eventDays: true } },
        },
      });
      rows = records.map((p) => ({
        code: p.code,
        name: p.name,
        client: p.client.name,
        type: p.eventType,
        status: p.status,
        "start date": date(p.startDate),
        "end date": date(p.endDate),
        venue: p.venue,
        city: p.city,
        "package value": toNumber(p.packageValue),
        manager: p.manager?.name,
        "event days": p._count.eventDays,
        deliverables: p._count.deliverables,
      }));
      break;
    }

    case "invoices": {
      const records = await prisma.invoice.findMany({
        where: { studioId },
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { name: true } },
          project: { select: { name: true } },
        },
      });
      rows = records.map((i) => ({
        number: i.number,
        client: i.client.name,
        project: i.project?.name,
        status: i.status,
        issued: date(i.issueDate),
        due: date(i.dueDate),
        subtotal: toNumber(i.subtotal),
        discount: toNumber(i.discount),
        "tax percent": toNumber(i.taxPercent),
        "tax amount": toNumber(i.taxAmount),
        total: toNumber(i.total),
        paid: toNumber(i.amountPaid),
        balance: toNumber(i.total) - toNumber(i.amountPaid),
      }));
      break;
    }

    case "expenses": {
      const records = await prisma.expense.findMany({
        where: { studioId },
        orderBy: { spentOn: "desc" },
        include: { project: { select: { name: true } } },
      });
      rows = records.map((e) => ({
        title: e.title,
        category: e.category,
        amount: toNumber(e.amount),
        date: date(e.spentOn),
        project: e.project?.name,
        vendor: e.vendor,
        method: e.method,
        note: e.note,
      }));
      break;
    }

    case "clients": {
      const records = await prisma.client.findMany({
        where: { studioId },
        orderBy: { name: "asc" },
        include: { _count: { select: { projects: true } } },
      });
      rows = records.map((c) => ({
        name: c.name,
        partner: c.partnerName,
        phone: c.phone,
        email: c.email,
        city: c.city,
        address: c.addressLine,
        instagram: c.instagram,
        projects: c._count.projects,
      }));
      break;
    }

    default:
      return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
  }

  const filename = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;

  // A single empty line keeps spreadsheet apps from choking on a zero-byte file.
  return new NextResponse(toCsv(rows) || "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
