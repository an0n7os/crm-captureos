"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import type { ActionState } from "@/lib/validators";

const PIN_COOKIE_PREFIX = "pp_";
const PIN_MAX_AGE = 60 * 60 * 24 * 30;

const cookieName = (token: string) => `${PIN_COOKIE_PREFIX}${token.slice(0, 24)}`;

/** True when the visitor has already cleared this project's PIN gate. */
export async function hasProjectPinAccess(token: string, pin: string | null) {
  if (!pin) return true;
  const store = await cookies();
  return store.get(cookieName(token))?.value === pin;
}

export async function submitProjectPinAction(
  token: string,
  pin: string,
): Promise<ActionState> {
  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    select: { portalPin: true },
  });
  if (!project) return { error: "This link is no longer valid" };
  if (!project.portalPin) return { ok: true };

  if (pin.replace(/\D/g, "") !== project.portalPin) {
    return { error: "That PIN is not correct" };
  }

  const store = await cookies();
  store.set(cookieName(token), project.portalPin, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PIN_MAX_AGE,
  });

  revalidatePath(`/p/${token}`);
  return { ok: true };
}

/** Records the client's typed-name signature against a contract. */
export async function signContractAction(
  token: string,
  signerName: string,
): Promise<ActionState> {
  if (!signerName.trim()) return { error: "Type your full name to sign" };

  const contract = await prisma.contract.findUnique({
    where: { shareToken: token },
    select: { id: true, studioId: true, status: true, title: true, projectId: true },
  });
  if (!contract) return { error: "This contract link is no longer valid" };
  if (contract.status === "SIGNED") return { error: "This contract has already been signed" };

  await prisma.contract.update({
    where: { id: contract.id },
    data: {
      status: "SIGNED",
      signedAt: new Date(),
      signerName: signerName.trim(),
    },
  });

  await prisma.notification.create({
    data: {
      studioId: contract.studioId,
      title: "Contract signed",
      body: `${signerName.trim()} signed ${contract.title}`,
      href: `/projects/${contract.projectId}?tab=contract`,
    },
  });

  revalidatePath(`/c/${token}`);
  revalidatePath(`/projects/${contract.projectId}`);
  return { ok: true };
}

export async function declineContractAction(token: string): Promise<ActionState> {
  const contract = await prisma.contract.findUnique({
    where: { shareToken: token },
    select: { id: true, studioId: true, status: true, title: true, projectId: true },
  });
  if (!contract) return { error: "This contract link is no longer valid" };
  if (contract.status === "SIGNED") return { error: "This contract has already been signed" };

  await prisma.contract.update({
    where: { id: contract.id },
    data: { status: "DECLINED", declinedAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      studioId: contract.studioId,
      title: "Contract declined",
      body: contract.title,
      href: `/projects/${contract.projectId}?tab=contract`,
    },
  });

  revalidatePath(`/c/${token}`);
  return { ok: true };
}
