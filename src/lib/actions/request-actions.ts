"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { logActivity } from "@/lib/actions/helpers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  formToObject,
  requestSchema,
  zodFieldErrors,
  type ActionState,
} from "@/lib/validators";

import type { Priority, RequestStatus } from "@/generated/prisma/enums";

export async function saveRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const studioId = user.studioId;
  const id = String(formData.get("id") ?? "");

  const parsed = requestSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const v = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: v.projectId, studioId },
    select: { id: true, clientId: true },
  });
  if (!project) return { fieldErrors: { projectId: "Choose a project from your studio" } };

  const status = v.status as RequestStatus;
  const data = {
    title: v.title,
    description: v.description ?? null,
    status,
    priority: v.priority as Priority,
    taskId: v.taskId || null,
    resolvedAt: status === "RESOLVED" ? new Date() : null,
  };

  if (id) {
    const result = await prisma.clientRequest.updateMany({ where: { id, studioId }, data });
    if (result.count === 0) return { error: "Request not found" };
  } else {
    await prisma.clientRequest.create({
      data: { ...data, studioId, projectId: project.id, clientId: project.clientId },
    });
    await logActivity(studioId, user.id, "request.created", "request", project.id, `New request — ${v.title}`);
  }

  revalidatePath("/requests");
  revalidatePath(`/projects/${v.projectId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateRequestStatusAction(id: string, status: string) {
  const user = await requireUser();

  const result = await prisma.clientRequest.updateMany({
    where: { id, studioId: user.studioId },
    data: {
      status: status as RequestStatus,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
    },
  });
  if (result.count === 0) return { ok: false, error: "Request not found" };

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function addRequestCommentAction(
  requestId: string,
  body: string,
): Promise<ActionState> {
  const user = await requireUser();

  if (!body.trim()) return { error: "Write something first" };

  const request = await prisma.clientRequest.findFirst({
    where: { id: requestId, studioId: user.studioId },
    select: { id: true },
  });
  if (!request) return { error: "Request not found" };

  await prisma.requestComment.create({
    data: {
      studioId: user.studioId,
      requestId,
      body: body.trim(),
      authorId: user.id,
      authorName: user.name,
    },
  });

  revalidatePath("/requests");
  return { ok: true };
}

export async function deleteRequestAction(id: string) {
  const user = await requireUser();

  const request = await prisma.clientRequest.findFirst({
    where: { id, studioId: user.studioId },
    select: { projectId: true },
  });
  if (!request) notFound();

  await prisma.clientRequest.delete({ where: { id } });

  revalidatePath("/requests");
  revalidatePath(`/projects/${request.projectId}`);
}
