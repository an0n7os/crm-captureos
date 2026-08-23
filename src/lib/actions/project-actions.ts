"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { logActivity, nextNumber, syncProjectDates } from "@/lib/actions/helpers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  clientSchema,
  deliverableSchema,
  eventDaySchema,
  formToObject,
  projectSchema,
  zodFieldErrors,
  type ActionState,
} from "@/lib/validators";

import type {
  DeliverableStatus,
  EventType,
  ProjectStatus,
} from "@/generated/prisma/enums";

// --- Clients ---------------------------------------------------------------

export async function saveClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const parsed = clientSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const v = parsed.data;
  const data = {
    name: v.name,
    partnerName: v.partnerName ?? null,
    email: v.email ?? null,
    phone: v.phone ?? null,
    city: v.city ?? null,
    addressLine: v.addressLine ?? null,
    instagram: v.instagram ?? null,
    notes: v.notes ?? null,
  };

  if (id) {
    const result = await prisma.client.updateMany({
      where: { id, studioId: user.studioId },
      data,
    });
    if (result.count === 0) return { error: "Client not found" };
  } else {
    await prisma.client.create({ data: { ...data, studioId: user.studioId } });
  }

  revalidatePath("/clients");
  revalidatePath("/projects");
  return { ok: true };
}

// --- Projects --------------------------------------------------------------

export async function saveProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const studioId = user.studioId;
  const id = String(formData.get("id") ?? "");

  const parsed = projectSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const v = parsed.data;

  // Confirm the client belongs to this studio before linking to it.
  const client = await prisma.client.findFirst({
    where: { id: v.clientId, studioId },
    select: { id: true },
  });
  if (!client) return { fieldErrors: { clientId: "Choose a client from your studio" } };

  const data = {
    clientId: v.clientId,
    name: v.name,
    eventType: v.eventType as EventType,
    status: v.status as ProjectStatus,
    venue: v.venue ?? null,
    city: v.city ?? null,
    packageValue: v.packageValue,
    managerId: v.managerId || null,
    notes: v.notes ?? null,
  };

  let projectId = id;

  if (id) {
    const result = await prisma.project.updateMany({ where: { id, studioId }, data });
    if (result.count === 0) return { error: "Project not found" };
    await logActivity(studioId, user.id, "project.updated", "project", id, `Updated ${v.name}`);
  } else {
    const templates = await prisma.deliverableTemplate.findMany({
      where: { studioId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    const created = await prisma.project.create({
      data: {
        ...data,
        studioId,
        code: await nextNumber(studioId, "project"),
        deliverables: {
          create: templates.map((t) => ({ studioId, name: t.name, description: t.description })),
        },
      },
    });
    projectId = created.id;
    await logActivity(
      studioId,
      user.id,
      "project.created",
      "project",
      created.id,
      `Created project ${v.name}`,
    );
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${projectId}`);
}

export async function updateProjectStatusAction(id: string, status: string) {
  const user = await requireUser();

  const result = await prisma.project.updateMany({
    where: { id, studioId: user.studioId },
    data: { status: status as ProjectStatus },
  });
  if (result.count === 0) return { ok: false, error: "Project not found" };

  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteProjectAction(id: string) {
  const user = await requireUser();
  await prisma.project.deleteMany({ where: { id, studioId: user.studioId } });

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect("/projects");
}

// --- Event days ------------------------------------------------------------

export async function saveEventDayAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const studioId = user.studioId;
  const id = String(formData.get("id") ?? "");

  const parsed = eventDaySchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const v = parsed.data;
  const project = await prisma.project.findFirst({
    where: { id: v.projectId, studioId },
    select: { id: true },
  });
  if (!project) return { error: "Project not found" };

  const data = {
    title: v.title,
    eventType: v.eventType as EventType,
    date: v.date,
    startTime: v.startTime ?? null,
    endTime: v.endTime ?? null,
    venue: v.venue ?? null,
    city: v.city ?? null,
    mapUrl: v.mapUrl ?? null,
    notes: v.notes ?? null,
  };

  if (id) {
    const result = await prisma.eventDay.updateMany({ where: { id, studioId }, data });
    if (result.count === 0) return { error: "Event day not found" };
  } else {
    await prisma.eventDay.create({ data: { ...data, studioId, projectId: v.projectId } });
  }

  await syncProjectDates(v.projectId);

  revalidatePath(`/projects/${v.projectId}`);
  revalidatePath("/scheduling");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteEventDayAction(id: string) {
  const user = await requireUser();

  const day = await prisma.eventDay.findFirst({
    where: { id, studioId: user.studioId },
    select: { projectId: true },
  });
  if (!day) notFound();

  await prisma.eventDay.delete({ where: { id } });
  await syncProjectDates(day.projectId);

  revalidatePath(`/projects/${day.projectId}`);
  revalidatePath("/scheduling");
}

// --- Deliverables ----------------------------------------------------------

export async function saveDeliverableAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const studioId = user.studioId;
  const id = String(formData.get("id") ?? "");

  const parsed = deliverableSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const v = parsed.data;
  const project = await prisma.project.findFirst({
    where: { id: v.projectId, studioId },
    select: { id: true },
  });
  if (!project) return { error: "Project not found" };

  const status = v.status as DeliverableStatus;
  const data = {
    name: v.name,
    description: v.description ?? null,
    quantity: v.quantity,
    status,
    dueDate: v.dueDate ?? null,
    deliveryUrl: v.deliveryUrl ?? null,
    deliveredAt: status === "DELIVERED" ? new Date() : null,
  };

  if (id) {
    const result = await prisma.deliverable.updateMany({ where: { id, studioId }, data });
    if (result.count === 0) return { error: "Deliverable not found" };
  } else {
    await prisma.deliverable.create({ data: { ...data, studioId, projectId: v.projectId } });
  }

  revalidatePath(`/projects/${v.projectId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateDeliverableStatusAction(id: string, status: string) {
  const user = await requireUser();

  const deliverable = await prisma.deliverable.findFirst({
    where: { id, studioId: user.studioId },
    select: { projectId: true },
  });
  if (!deliverable) return { ok: false, error: "Deliverable not found" };

  await prisma.deliverable.update({
    where: { id },
    data: {
      status: status as DeliverableStatus,
      deliveredAt: status === "DELIVERED" ? new Date() : null,
    },
  });

  revalidatePath(`/projects/${deliverable.projectId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteDeliverableAction(id: string) {
  const user = await requireUser();

  const deliverable = await prisma.deliverable.findFirst({
    where: { id, studioId: user.studioId },
    select: { projectId: true },
  });
  if (!deliverable) notFound();

  await prisma.deliverable.delete({ where: { id } });
  revalidatePath(`/projects/${deliverable.projectId}`);
}
