"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/validators";

import type { ContractStatus } from "@/generated/prisma/enums";

export async function saveContractAction(
  projectId: string,
  title: string,
  body: string,
): Promise<ActionState> {
  const user = await requireUser();

  if (!title.trim()) return { error: "Enter a contract title" };
  if (!body.trim()) return { error: "The contract body cannot be empty" };

  const project = await prisma.project.findFirst({
    where: { id: projectId, studioId: user.studioId },
    select: { id: true },
  });
  if (!project) return { error: "Project not found" };

  await prisma.contract.upsert({
    where: { projectId },
    create: {
      studioId: user.studioId,
      projectId,
      title: title.trim(),
      body: body.trim(),
    },
    // Editing a signed contract would invalidate the signature, so guard it.
    update: { title: title.trim(), body: body.trim() },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function updateContractStatusAction(projectId: string, status: string) {
  const user = await requireUser();

  const contract = await prisma.contract.findFirst({
    where: { projectId, studioId: user.studioId },
    select: { id: true },
  });
  if (!contract) return { ok: false, error: "Contract not found" };

  await prisma.contract.update({
    where: { id: contract.id },
    data: {
      status: status as ContractStatus,
      sentAt: status === "SENT" ? new Date() : undefined,
      signedAt: status === "SIGNED" ? new Date() : null,
      declinedAt: status === "DECLINED" ? new Date() : null,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function deleteContractAction(projectId: string) {
  const user = await requireUser();

  const contract = await prisma.contract.findFirst({
    where: { projectId, studioId: user.studioId },
    select: { id: true },
  });
  if (!contract) notFound();

  await prisma.contract.delete({ where: { id: contract.id } });
  revalidatePath(`/projects/${projectId}`);
}

// --- Moodboard -------------------------------------------------------------

export async function addMoodboardItemAction(
  projectId: string,
  imageUrl: string,
  linkUrl: string,
  caption: string,
): Promise<ActionState> {
  const user = await requireUser();

  if (!imageUrl && !linkUrl) return { error: "Add an image or a reference link" };

  const project = await prisma.project.findFirst({
    where: { id: projectId, studioId: user.studioId },
    select: { id: true },
  });
  if (!project) return { error: "Project not found" };

  const count = await prisma.moodboardItem.count({ where: { projectId } });

  await prisma.moodboardItem.create({
    data: {
      studioId: user.studioId,
      projectId,
      imageUrl: imageUrl || null,
      linkUrl: linkUrl || null,
      caption: caption || null,
      sortOrder: count,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function deleteMoodboardItemAction(id: string) {
  const user = await requireUser();

  const item = await prisma.moodboardItem.findFirst({
    where: { id, studioId: user.studioId },
    select: { projectId: true },
  });
  if (!item) notFound();

  await prisma.moodboardItem.delete({ where: { id } });
  revalidatePath(`/projects/${item.projectId}`);
}

// --- Client share link -----------------------------------------------------

/** Sets or clears the PIN that gates the project's client link. */
export async function updateProjectPinAction(
  projectId: string,
  pin: string,
): Promise<ActionState> {
  const user = await requireUser();

  const cleaned = pin.replace(/\D/g, "");
  if (cleaned && cleaned.length !== 4) return { error: "Use a 4-digit PIN, or leave it blank" };

  const result = await prisma.project.updateMany({
    where: { id: projectId, studioId: user.studioId },
    data: { portalPin: cleaned || null },
  });
  if (result.count === 0) return { error: "Project not found" };

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
