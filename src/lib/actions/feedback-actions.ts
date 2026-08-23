"use server";

import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/actions/helpers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/validators";

const LABEL: Record<string, string> = {
  IDEA: "Idea",
  BUG: "Bug report",
  QUESTION: "Question",
  OTHER: "Feedback",
};

/**
 * In-app feedback. Stored as an activity entry plus a notification for the
 * owner — swap the notification for an email or webhook when you have one.
 */
export async function sendFeedbackAction(
  kind: string,
  message: string,
): Promise<ActionState> {
  const user = await requireUser();

  const body = message.trim();
  if (body.length < 5) return { error: "Tell us a little more" };
  if (body.length > 4000) return { error: "That's too long — trim it down a bit" };

  const label = LABEL[kind] ?? "Feedback";

  const owner = await prisma.user.findFirst({
    where: { studioId: user.studioId, role: "OWNER", isActive: true },
    select: { id: true },
  });

  await prisma.notification.create({
    data: {
      studioId: user.studioId,
      userId: owner?.id ?? null,
      title: `${label} from ${user.name}`,
      body: body.slice(0, 200),
    },
  });

  await logActivity(
    user.studioId,
    user.id,
    "feedback.sent",
    "feedback",
    user.id,
    `${label}: ${body.slice(0, 120)}`,
  );

  revalidatePath("/dashboard");
  return { ok: true };
}
