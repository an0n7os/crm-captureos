"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { slugify } from "@/lib/utils";
import type { ActionState } from "@/lib/validators";

import type { EnquirySource, EventType } from "@/generated/prisma/enums";

/** Studio-side settings for the public lead page. */
export async function saveLeadPageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const studioId = user.studioId;

  const rawSlug = String(formData.get("enquirySlug") ?? "").trim();
  const slug = slugify(rawSlug || user.studio.name);
  if (!slug) return { fieldErrors: { enquirySlug: "Enter a valid link name" } };

  const clash = await prisma.studio.findFirst({
    where: { enquirySlug: slug, id: { not: studioId } },
    select: { id: true },
  });
  if (clash) return { fieldErrors: { enquirySlug: "That link is already taken" } };

  await prisma.studio.update({
    where: { id: studioId },
    data: {
      enquirySlug: slug,
      enquiryEnabled: formData.get("enquiryEnabled") === "on",
      enquiryCoverUrl: String(formData.get("enquiryCoverUrl") ?? "") || null,
      enquiryHeading: String(formData.get("enquiryHeading") ?? "").trim() || null,
      enquirySubtext: String(formData.get("enquirySubtext") ?? "").trim() || null,
    },
  });

  revalidatePath("/enquiries");
  return { ok: true };
}

/** Records a visit so the analytics tab has a denominator for conversion. */
export async function trackLeadPageViewAction(studioId: string, referrer: string | null) {
  await prisma.leadPageView.create({
    data: { studioId, referrer: referrer || null },
  });
}

/**
 * Public submission from the lead page. Anyone with the link may call this, so
 * it writes an enquiry and nothing else — no ids from the caller are trusted.
 */
export async function submitLeadAction(
  slug: string,
  input: {
    name: string;
    contact: string;
    eventDetails: string;
    venue: string;
    guests: string;
    budget: string;
    source: string;
  },
): Promise<ActionState> {
  if (!input.name.trim()) return { error: "Enter your name" };
  if (!input.contact.trim()) return { error: "Enter a phone number or email" };

  const studio = await prisma.studio.findUnique({
    where: { enquirySlug: slug },
    select: { id: true, enquiryEnabled: true, name: true },
  });
  if (!studio || !studio.enquiryEnabled) {
    return { error: "This enquiry form is not accepting submissions right now" };
  }

  const contact = input.contact.trim();
  const looksLikeEmail = contact.includes("@");

  const guests = Number(input.guests.replace(/\D/g, ""));
  const budget = Number(input.budget.replace(/[^\d.]/g, ""));

  const source = ["INSTAGRAM", "FACEBOOK", "GOOGLE", "REFERRAL", "WEBSITE", "WALK_IN", "WHATSAPP", "VENDOR"].includes(
    input.source,
  )
    ? (input.source as EnquirySource)
    : "WEBSITE";

  const enquiry = await prisma.enquiry.create({
    data: {
      studioId: studio.id,
      contactName: input.name.trim(),
      phone: looksLikeEmail ? null : contact,
      email: looksLikeEmail ? contact.toLowerCase() : null,
      venue: input.venue.trim() || null,
      guestCount: Number.isFinite(guests) && guests > 0 ? guests : null,
      budgetMax: Number.isFinite(budget) && budget > 0 ? budget : null,
      eventType: "WEDDING" as EventType,
      status: "NEW",
      source,
      notes: input.eventDetails.trim() || null,
    },
  });

  await prisma.$transaction([
    prisma.leadPageView.create({ data: { studioId: studio.id, submitted: true } }),
    prisma.notification.create({
      data: {
        studioId: studio.id,
        title: "New enquiry from your link",
        body: `${input.name.trim()} — ${contact}`,
        href: `/enquiries/${enquiry.id}`,
      },
    }),
  ]);

  revalidatePath("/enquiries");
  revalidatePath("/dashboard");
  return { ok: true };
}
