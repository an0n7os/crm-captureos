import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { SESSION_COOKIE, readSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Cached per request so a page and its nested components share one DB round-trip.
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await readSessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findFirst({
    where: { id: payload.userId, studioId: payload.studioId, isActive: true },
    include: { studio: true },
  });

  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Use in every authenticated page and server action. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Tenant guard: the studio id every query must be scoped by. */
export async function requireStudioId(): Promise<string> {
  const user = await requireUser();
  return user.studioId;
}
