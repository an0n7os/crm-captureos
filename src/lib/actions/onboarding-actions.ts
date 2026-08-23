"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { slugify } from "@/lib/utils";
import { formToObject, type ActionState } from "@/lib/validators";

/** Step 1 — who the studio is. */
export async function saveOnboardingProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const raw = formToObject(formData) as Record<string, string>;

  const ownerName = (raw.ownerName ?? "").trim();
  const studioName = (raw.studioName ?? "").trim();
  const whatsapp = `${(raw.dialCode ?? "").trim()} ${(raw.whatsappNumber ?? "").trim()}`.trim();

  const fieldErrors: Record<string, string> = {};
  if (ownerName.length < 2) fieldErrors.ownerName = "Enter your name";
  if (studioName.length < 2) fieldErrors.studioName = "Enter your studio name";
  if ((raw.whatsappNumber ?? "").replace(/\D/g, "").length < 6) {
    fieldErrors.whatsappNumber = "Enter a valid WhatsApp number";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { name: ownerName, avatarUrl: raw.avatarUrl || null },
    }),
    prisma.studio.update({
      where: { id: user.studioId },
      data: {
        name: studioName,
        logoUrl: raw.logoUrl || null,
        whatsappNumber: whatsapp || null,
        phone: whatsapp || null,
        addressLine: (raw.addressLine ?? "").trim() || null,
        city: (raw.city ?? "").trim() || null,
        state: (raw.state ?? "").trim() || null,
        // Reserve the public lead-page link from the studio name.
        enquirySlug: await uniqueEnquirySlug(studioName, user.studioId),
      },
    }),
  ]);

  revalidatePath("/settings");
  redirect("/onboarding/business");
}

async function uniqueEnquirySlug(name: string, studioId: string) {
  const root = slugify(name) || "studio";
  let candidate = root;
  let n = 1;

  while (true) {
    const taken = await prisma.studio.findFirst({
      where: { enquirySlug: candidate, id: { not: studioId } },
      select: { id: true },
    });
    if (!taken) return candidate;
    candidate = `${root}-${++n}`;
  }
}

/** Step 2 — how the studio works, then straight into the app. */
export async function saveOnboardingBusinessAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const raw = formToObject(formData) as Record<string, string>;

  const currency = raw.currency || "INR";
  const gstNumber = (raw.gstNumber ?? "").trim() || null;

  await prisma.studio.update({
    where: { id: user.studioId },
    data: { currency, gstNumber, onboardedAt: new Date() },
  });

  // Seed a starter package so quotes and invoices are usable immediately.
  const startingPrice = Number((raw.typicalPackage ?? "").replace(/[^\d.]/g, ""));
  if (Number.isFinite(startingPrice) && startingPrice > 0) {
    const existing = await prisma.package.count({ where: { studioId: user.studioId } });
    await prisma.package.create({
      data: {
        studioId: user.studioId,
        name: "Standard coverage",
        price: startingPrice,
        inclusions: ["Full-day coverage", "Edited photos", "Highlight film"],
        sortOrder: existing,
      },
    });
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function skipOnboardingAction() {
  const user = await requireUser();
  await prisma.studio.update({
    where: { id: user.studioId },
    data: { onboardedAt: new Date() },
  });
  redirect("/dashboard");
}
