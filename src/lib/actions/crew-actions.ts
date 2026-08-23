"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { crewSchema, formToObject, zodFieldErrors, type ActionState } from "@/lib/validators";

import type { AssignmentStatus, CrewRole, CrewType } from "@/generated/prisma/enums";

export async function saveCrewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const parsed = crewSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const v = parsed.data;
  const data = {
    name: v.name,
    phone: v.phone ?? null,
    email: v.email ?? null,
    city: v.city ?? null,
    type: v.type as CrewType,
    role: v.role as CrewRole,
    dayRate: v.dayRate ?? null,
    // Comma-separated in the form, stored as an array.
    skills: v.skills ? v.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
    notes: v.notes ?? null,
  };

  if (id) {
    const result = await prisma.crewMember.updateMany({
      where: { id, studioId: user.studioId },
      data,
    });
    if (result.count === 0) return { error: "Crew member not found" };
  } else {
    await prisma.crewMember.create({ data: { ...data, studioId: user.studioId } });
  }

  revalidatePath("/team");
  revalidatePath("/scheduling");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function toggleCrewActiveAction(id: string) {
  const user = await requireUser();

  const crew = await prisma.crewMember.findFirst({
    where: { id, studioId: user.studioId },
    select: { isActive: true },
  });
  if (!crew) return { ok: false, error: "Crew member not found" };

  await prisma.crewMember.update({ where: { id }, data: { isActive: !crew.isActive } });

  revalidatePath("/team");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteCrewAction(id: string) {
  const user = await requireUser();
  await prisma.crewMember.deleteMany({ where: { id, studioId: user.studioId } });

  revalidatePath("/team");
  revalidatePath("/scheduling");
}

// --- Assignments -----------------------------------------------------------

/**
 * Books a crew member onto an event day. Refuses if they are already booked on
 * another event that day, or marked unavailable.
 */
export async function assignCrewAction(
  eventDayId: string,
  crewId: string,
  role: string,
  agreedFee?: number,
): Promise<ActionState> {
  const user = await requireUser();
  const studioId = user.studioId;

  const [eventDay, crew] = await Promise.all([
    prisma.eventDay.findFirst({ where: { id: eventDayId, studioId }, select: { id: true, date: true, projectId: true } }),
    prisma.crewMember.findFirst({ where: { id: crewId, studioId }, select: { id: true, name: true, dayRate: true } }),
  ]);
  if (!eventDay || !crew) return { error: "Event day or crew member not found" };

  const dayStart = new Date(eventDay.date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const [clash, leave] = await Promise.all([
    prisma.crewAssignment.findFirst({
      where: {
        crewId,
        status: { not: "DECLINED" },
        eventDay: { date: { gte: dayStart, lt: dayEnd }, id: { not: eventDayId } },
      },
      include: { eventDay: { select: { title: true, project: { select: { name: true } } } } },
    }),
    prisma.crewUnavailability.findFirst({
      where: { crewId, startDate: { lte: eventDay.date }, endDate: { gte: eventDay.date } },
    }),
  ]);

  if (clash) {
    return {
      error: `${crew.name} is already booked for ${clash.eventDay.project.name} — ${clash.eventDay.title} that day.`,
    };
  }
  if (leave) {
    return { error: `${crew.name} is marked unavailable on this date${leave.reason ? ` (${leave.reason})` : ""}.` };
  }

  await prisma.crewAssignment.create({
    data: {
      studioId,
      eventDayId,
      crewId,
      role: role as CrewRole,
      agreedFee: agreedFee ?? crew.dayRate ?? null,
    },
  });

  revalidatePath("/scheduling");
  revalidatePath(`/projects/${eventDay.projectId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateAssignmentStatusAction(id: string, status: string) {
  const user = await requireUser();

  const result = await prisma.crewAssignment.updateMany({
    where: { id, studioId: user.studioId },
    data: { status: status as AssignmentStatus },
  });
  if (result.count === 0) return { ok: false, error: "Assignment not found" };

  revalidatePath("/scheduling");
  return { ok: true };
}

export async function removeAssignmentAction(id: string) {
  const user = await requireUser();

  const assignment = await prisma.crewAssignment.findFirst({
    where: { id, studioId: user.studioId },
    select: { eventDay: { select: { projectId: true } } },
  });
  if (!assignment) notFound();

  await prisma.crewAssignment.delete({ where: { id } });

  revalidatePath("/scheduling");
  revalidatePath(`/projects/${assignment.eventDay.projectId}`);
}

export async function addUnavailabilityAction(
  crewId: string,
  startDate: string,
  endDate: string,
  reason: string,
): Promise<ActionState> {
  const user = await requireUser();

  const crew = await prisma.crewMember.findFirst({
    where: { id: crewId, studioId: user.studioId },
    select: { id: true },
  });
  if (!crew) return { error: "Crew member not found" };

  const start = new Date(startDate);
  const end = new Date(endDate || startDate);
  if (Number.isNaN(+start) || Number.isNaN(+end)) return { error: "Choose valid dates" };
  if (end < start) return { error: "The end date cannot be before the start date" };

  await prisma.crewUnavailability.create({
    data: { studioId: user.studioId, crewId, startDate: start, endDate: end, reason: reason || null },
  });

  revalidatePath("/scheduling");
  revalidatePath("/team");
  return { ok: true };
}

export async function removeUnavailabilityAction(id: string) {
  const user = await requireUser();
  await prisma.crewUnavailability.deleteMany({ where: { id, studioId: user.studioId } });

  revalidatePath("/scheduling");
  revalidatePath("/team");
}
