"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  enquirySchema,
  formToObject,
  zodFieldErrors,
  type ActionState,
} from "@/lib/validators";

import type { EnquiryStatus, EventType, EnquirySource } from "@/generated/prisma/enums";

async function logActivity(
  studioId: string,
  userId: string,
  action: string,
  entityId: string,
  summary: string,
) {
  await prisma.activity.create({
    data: { studioId, userId, action, entityType: "enquiry", entityId, summary },
  });
}

export async function saveEnquiryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const parsed = enquirySchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const v = parsed.data;
  const data = {
    contactName: v.contactName,
    partnerName: v.partnerName ?? null,
    phone: v.phone ?? null,
    email: v.email ?? null,
    city: v.city ?? null,
    eventType: v.eventType as EventType,
    eventDate: v.eventDate ?? null,
    venue: v.venue ?? null,
    guestCount: v.guestCount ?? null,
    budgetMin: v.budgetMin ?? null,
    budgetMax: v.budgetMax ?? null,
    status: v.status as EnquiryStatus,
    source: v.source as EnquirySource,
    nextFollowUpAt: v.nextFollowUpAt ?? null,
    ownerId: v.ownerId || null,
    notes: v.notes ?? null,
    lostReason: v.status === "LOST" ? (v.lostReason ?? null) : null,
    closedAt: v.status === "WON" || v.status === "LOST" ? new Date() : null,
  };

  let enquiryId = id;

  if (id) {
    // Scoped update: a mismatched studioId matches zero rows rather than leaking.
    const result = await prisma.enquiry.updateMany({
      where: { id, studioId: user.studioId },
      data,
    });
    if (result.count === 0) return { error: "Enquiry not found" };
    await logActivity(user.studioId, user.id, "enquiry.updated", id, `Updated enquiry — ${v.contactName}`);
  } else {
    const created = await prisma.enquiry.create({
      data: { ...data, studioId: user.studioId, ownerId: data.ownerId ?? user.id },
    });
    enquiryId = created.id;
    await logActivity(
      user.studioId,
      user.id,
      "enquiry.created",
      created.id,
      `New enquiry — ${v.contactName}`,
    );
  }

  revalidatePath("/enquiries");
  revalidatePath("/dashboard");
  redirect(`/enquiries/${enquiryId}`);
}

export async function updateEnquiryStatusAction(id: string, status: string) {
  const user = await requireUser();

  const result = await prisma.enquiry.updateMany({
    where: { id, studioId: user.studioId },
    data: {
      status: status as EnquiryStatus,
      closedAt: status === "WON" || status === "LOST" ? new Date() : null,
      contactedAt: status === "CONTACTED" ? new Date() : undefined,
    },
  });
  if (result.count === 0) return { ok: false, error: "Enquiry not found" };

  await logActivity(user.studioId, user.id, "enquiry.status", id, `Enquiry moved to ${status}`);

  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteEnquiryAction(id: string) {
  const user = await requireUser();
  await prisma.enquiry.deleteMany({ where: { id, studioId: user.studioId } });

  revalidatePath("/enquiries");
  revalidatePath("/dashboard");
  redirect("/enquiries");
}

/**
 * Converts a won enquiry into a project, creating the client record on first
 * conversion and copying the studio's default deliverables onto the project.
 */
export async function convertEnquiryAction(id: string): Promise<void> {
  const user = await requireUser();
  const studioId = user.studioId;

  const enquiry = await prisma.enquiry.findFirst({
    where: { id, studioId },
    include: { project: { select: { id: true } } },
  });
  if (!enquiry) notFound();
  if (enquiry.project) redirect(`/projects/${enquiry.project.id}`);

  const templates = await prisma.deliverableTemplate.findMany({
    where: { studioId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const projectId = await prisma.$transaction(async (tx) => {
    const clientId =
      enquiry.clientId ??
      (
        await tx.client.create({
          data: {
            studioId,
            name: enquiry.contactName,
            partnerName: enquiry.partnerName,
            phone: enquiry.phone,
            email: enquiry.email,
            city: enquiry.city,
          },
        })
      ).id;

    // Sequential per-studio code: WED-0001, WED-0002…
    const count = await tx.project.count({ where: { studioId } });
    const code = `PRJ-${String(count + 1).padStart(4, "0")}`;

    const project = await tx.project.create({
      data: {
        studioId,
        clientId,
        enquiryId: enquiry.id,
        code,
        name: enquiry.partnerName
          ? `${enquiry.contactName} & ${enquiry.partnerName}`
          : enquiry.contactName,
        eventType: enquiry.eventType,
        startDate: enquiry.eventDate,
        endDate: enquiry.eventDate,
        venue: enquiry.venue,
        city: enquiry.city,
        packageValue: enquiry.budgetMax ?? enquiry.budgetMin ?? 0,
        managerId: enquiry.ownerId ?? user.id,
        deliverables: {
          create: templates.map((t) => ({
            studioId,
            name: t.name,
            description: t.description,
            dueDate: enquiry.eventDate
              ? new Date(enquiry.eventDate.getTime() + t.dueInDays * 86_400_000)
              : null,
          })),
        },
      },
    });

    // The event date becomes the project's first event day.
    if (enquiry.eventDate) {
      await tx.eventDay.create({
        data: {
          studioId,
          projectId: project.id,
          title: "Main event",
          eventType: enquiry.eventType,
          date: enquiry.eventDate,
          venue: enquiry.venue,
          city: enquiry.city,
        },
      });
    }

    await tx.enquiry.update({
      where: { id: enquiry.id },
      data: { status: "WON", clientId, closedAt: new Date() },
    });

    return project.id;
  });

  await logActivity(
    studioId,
    user.id,
    "enquiry.converted",
    enquiry.id,
    `Converted ${enquiry.contactName} into a project`,
  );

  revalidatePath("/enquiries");
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${projectId}`);
}
