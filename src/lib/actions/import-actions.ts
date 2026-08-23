"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/validators";

import type { EnquirySource } from "@/generated/prisma/enums";

const SOURCES = new Set([
  "INSTAGRAM",
  "FACEBOOK",
  "GOOGLE",
  "REFERRAL",
  "WEBSITE",
  "WALK_IN",
  "WHATSAPP",
  "VENDOR",
  "OTHER",
]);

/** Minimal CSV reader: handles quoted fields, escaped quotes and embedded commas. */
function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export async function importEnquiriesAction(csv: string): Promise<ActionState & { message?: string }> {
  const user = await requireUser();

  const rows = parseCsv(csv.trim());
  if (rows.length < 2) return { error: "Add a header row and at least one enquiry" };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const columnFor = (...names: string[]) => {
    for (const name of names) {
      const index = header.indexOf(name);
      if (index !== -1) return index;
    }
    return -1;
  };

  const index = {
    name: columnFor("name", "contact name", "client name"),
    phone: columnFor("phone", "mobile", "contact", "whatsapp"),
    email: columnFor("email"),
    city: columnFor("city", "location"),
    date: columnFor("event date", "date"),
    venue: columnFor("venue"),
    guests: columnFor("guests", "guest count"),
    budget: columnFor("budget", "budget max"),
    source: columnFor("source"),
    notes: columnFor("notes", "details", "event details"),
  };

  if (index.name === -1) return { error: 'The CSV needs a "name" column' };

  const cell = (row: string[], position: number) =>
    position === -1 ? "" : (row[position] ?? "").trim();

  const records: {
    studioId: string;
    contactName: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    eventDate: Date | null;
    venue: string | null;
    guestCount: number | null;
    budgetMax: number | null;
    source: EnquirySource;
    notes: string | null;
    ownerId: string;
  }[] = [];

  let skipped = 0;

  for (const row of rows.slice(1)) {
    const contactName = cell(row, index.name);
    if (!contactName) {
      skipped++;
      continue;
    }

    const rawDate = cell(row, index.date);
    const parsedDate = rawDate ? new Date(rawDate) : null;

    const guests = Number(cell(row, index.guests).replace(/\D/g, ""));
    const budget = Number(cell(row, index.budget).replace(/[^\d.]/g, ""));
    const source = cell(row, index.source).toUpperCase().replace(/[\s-]/g, "_");

    records.push({
      studioId: user.studioId,
      contactName,
      phone: cell(row, index.phone) || null,
      email: cell(row, index.email).toLowerCase() || null,
      city: cell(row, index.city) || null,
      eventDate: parsedDate && !Number.isNaN(+parsedDate) ? parsedDate : null,
      venue: cell(row, index.venue) || null,
      guestCount: Number.isFinite(guests) && guests > 0 ? guests : null,
      budgetMax: Number.isFinite(budget) && budget > 0 ? budget : null,
      source: (SOURCES.has(source) ? source : "OTHER") as EnquirySource,
      notes: cell(row, index.notes) || null,
      ownerId: user.id,
    });
  }

  if (records.length === 0) return { error: "No rows had a name to import" };

  await prisma.enquiry.createMany({ data: records });

  revalidatePath("/enquiries");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: `Imported ${records.length} ${records.length === 1 ? "enquiry" : "enquiries"}${
      skipped > 0 ? ` · skipped ${skipped} row${skipped === 1 ? "" : "s"} with no name` : ""
    }`,
  };
}
