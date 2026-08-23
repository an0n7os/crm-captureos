"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import type { ActionState } from "@/lib/validators";

/**
 * Actions reachable without a session, authorised purely by an unguessable
 * share token. Each one looks the record up by token — never by id — so a
 * caller can only ever touch the record whose link they already hold.
 */

export async function respondToQuotationAction(
  token: string,
  decision: "ACCEPTED" | "REJECTED",
): Promise<ActionState> {
  const quotation = await prisma.quotation.findUnique({
    where: { shareToken: token },
    select: { id: true, studioId: true, number: true, status: true },
  });
  if (!quotation) return { error: "This quotation link is no longer valid" };
  if (["ACCEPTED", "REJECTED"].includes(quotation.status)) {
    return { error: "You have already responded to this quotation" };
  }

  await prisma.quotation.update({
    where: { id: quotation.id },
    data: { status: decision, respondedAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      studioId: quotation.studioId,
      title: decision === "ACCEPTED" ? "Quotation accepted" : "Quotation declined",
      body: `${quotation.number} was ${decision.toLowerCase()} by the client`,
      href: `/quotations/${quotation.id}`,
    },
  });

  revalidatePath(`/q/${token}`);
  return { ok: true };
}

export async function createPortalRequestAction(
  token: string,
  projectId: string,
  title: string,
  description: string,
): Promise<ActionState> {
  if (!title.trim()) return { error: "Describe what you'd like changed" };

  const client = await prisma.client.findUnique({
    where: { portalToken: token },
    select: { id: true, studioId: true, name: true },
  });
  if (!client) return { error: "This portal link is no longer valid" };

  // The project must belong to the same client the token identifies.
  const project = await prisma.project.findFirst({
    where: { id: projectId, clientId: client.id },
    select: { id: true, name: true },
  });
  if (!project) return { error: "Project not found" };

  const request = await prisma.clientRequest.create({
    data: {
      studioId: client.studioId,
      projectId: project.id,
      clientId: client.id,
      title: title.trim(),
      description: description.trim() || null,
      fromPortal: true,
      status: "NEW",
    },
  });

  await prisma.notification.create({
    data: {
      studioId: client.studioId,
      title: "New client request",
      body: `${client.name} — ${title.trim()}`,
      href: `/requests`,
    },
  });

  revalidatePath(`/portal/${token}`);
  revalidatePath("/requests");
  return { ok: true, error: undefined, fieldErrors: { id: request.id } };
}

export async function addPortalCommentAction(
  token: string,
  requestId: string,
  body: string,
): Promise<ActionState> {
  if (!body.trim()) return { error: "Write something first" };

  const client = await prisma.client.findUnique({
    where: { portalToken: token },
    select: { id: true, studioId: true, name: true },
  });
  if (!client) return { error: "This portal link is no longer valid" };

  const request = await prisma.clientRequest.findFirst({
    where: { id: requestId, clientId: client.id },
    select: { id: true },
  });
  if (!request) return { error: "Request not found" };

  await prisma.requestComment.create({
    data: {
      studioId: client.studioId,
      requestId,
      body: body.trim(),
      authorName: client.name,
      fromPortal: true,
    },
  });

  revalidatePath(`/portal/${token}`);
  revalidatePath("/requests");
  return { ok: true };
}
