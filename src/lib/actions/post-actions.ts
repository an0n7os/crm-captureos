"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { logActivity } from "@/lib/actions/helpers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  formToObject,
  postTaskSchema,
  zodFieldErrors,
  type ActionState,
} from "@/lib/validators";

import type { PostStatus, Priority } from "@/generated/prisma/enums";

export async function savePostTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const studioId = user.studioId;
  const id = String(formData.get("id") ?? "");

  const parsed = postTaskSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const v = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: v.projectId, studioId },
    select: { id: true },
  });
  if (!project) return { fieldErrors: { projectId: "Choose a project from your studio" } };

  const status = v.status as PostStatus;
  const data = {
    title: v.title,
    description: v.description ?? null,
    status,
    priority: v.priority as Priority,
    assigneeId: v.assigneeId || null,
    deliverableId: v.deliverableId || null,
    dueDate: v.dueDate ?? null,
    startedAt: status !== "NOT_STARTED" ? new Date() : null,
    completedAt: status === "DELIVERED" || status === "APPROVED" ? new Date() : null,
  };

  if (id) {
    const result = await prisma.postTask.updateMany({ where: { id, studioId }, data });
    if (result.count === 0) return { error: "Task not found" };
  } else {
    await prisma.postTask.create({ data: { ...data, studioId, projectId: v.projectId } });
    await logActivity(studioId, user.id, "task.created", "post_task", v.projectId, `New edit task — ${v.title}`);
  }

  revalidatePath("/post-production");
  revalidatePath(`/projects/${v.projectId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function movePostTaskAction(id: string, status: string) {
  const user = await requireUser();

  const task = await prisma.postTask.findFirst({
    where: { id, studioId: user.studioId },
    select: { projectId: true, title: true },
  });
  if (!task) return { ok: false, error: "Task not found" };

  await prisma.postTask.update({
    where: { id },
    data: {
      status: status as PostStatus,
      startedAt: status !== "NOT_STARTED" ? new Date() : null,
      completedAt: status === "DELIVERED" || status === "APPROVED" ? new Date() : null,
    },
  });

  await logActivity(
    user.studioId,
    user.id,
    "task.status",
    "post_task",
    id,
    `${task.title} moved to ${status.replace(/_/g, " ").toLowerCase()}`,
  );

  revalidatePath("/post-production");
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deletePostTaskAction(id: string) {
  const user = await requireUser();

  const task = await prisma.postTask.findFirst({
    where: { id, studioId: user.studioId },
    select: { projectId: true },
  });
  if (!task) notFound();

  await prisma.postTask.delete({ where: { id } });

  revalidatePath("/post-production");
  revalidatePath(`/projects/${task.projectId}`);
}

/** Adds the next version number with a review link for the client. */
export async function addTaskVersionAction(
  taskId: string,
  url: string,
  note: string,
): Promise<ActionState> {
  const user = await requireUser();

  const task = await prisma.postTask.findFirst({
    where: { id: taskId, studioId: user.studioId },
    select: { id: true, projectId: true },
  });
  if (!task) return { error: "Task not found" };

  const last = await prisma.taskVersion.findFirst({
    where: { taskId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  await prisma.taskVersion.create({
    data: {
      studioId: user.studioId,
      taskId,
      version: (last?.version ?? 0) + 1,
      url: url || null,
      note: note || null,
      uploadedById: user.id,
    },
  });

  revalidatePath("/post-production");
  revalidatePath(`/projects/${task.projectId}`);
  return { ok: true };
}

export async function shareVersionAction(id: string) {
  const user = await requireUser();

  const result = await prisma.taskVersion.updateMany({
    where: { id, studioId: user.studioId },
    data: { isShared: true },
  });
  if (result.count === 0) return { ok: false, error: "Version not found" };

  revalidatePath("/post-production");
  return { ok: true };
}
