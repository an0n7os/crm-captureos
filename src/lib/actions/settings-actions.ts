"use server";

import { revalidatePath } from "next/cache";

import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  formToObject,
  inviteUserSchema,
  packageSchema,
  studioSettingsSchema,
  zodFieldErrors,
  type ActionState,
} from "@/lib/validators";

import type { PlanTier, Role } from "@/generated/prisma/enums";

/** Only owners and admins may change studio-wide settings or manage users. */
function canAdminister(role: Role) {
  return role === "OWNER" || role === "ADMIN";
}

export async function saveStudioAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!canAdminister(user.role)) return { error: "Only owners and admins can change these settings" };

  const parsed = studioSettingsSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const v = parsed.data;

  await prisma.$transaction([
    prisma.studio.update({
      where: { id: user.studioId },
      data: {
        name: v.name,
        logoUrl: v.logoUrl ?? null,
        email: v.email ?? null,
        phone: v.phone ?? null,
        whatsappNumber: v.whatsappNumber ?? null,
        website: v.website ?? null,
        gstNumber: v.gstNumber ?? null,
        addressLine: v.addressLine ?? null,
        city: v.city ?? null,
        state: v.state ?? null,
        pincode: v.pincode ?? null,
        currency: v.currency,
      },
    }),
    // The signed-in user's own name and photo live on the same settings screen.
    prisma.user.update({
      where: { id: user.id },
      data: {
        ...(v.ownerName ? { name: v.ownerName } : {}),
        avatarUrl: v.avatarUrl ?? null,
      },
    }),
  ]);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

// --- Packages --------------------------------------------------------------

export async function savePackageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const parsed = packageSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const v = parsed.data;
  const data = {
    name: v.name,
    description: v.description ?? null,
    price: v.price,
    // One inclusion per line in the textarea.
    inclusions: v.inclusions
      ? v.inclusions.split("\n").map((s) => s.trim()).filter(Boolean)
      : [],
  };

  if (id) {
    const result = await prisma.package.updateMany({
      where: { id, studioId: user.studioId },
      data,
    });
    if (result.count === 0) return { error: "Package not found" };
  } else {
    const count = await prisma.package.count({ where: { studioId: user.studioId } });
    await prisma.package.create({
      data: { ...data, studioId: user.studioId, sortOrder: count },
    });
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function deletePackageAction(id: string) {
  const user = await requireUser();
  await prisma.package.deleteMany({ where: { id, studioId: user.studioId } });
  revalidatePath("/settings");
}

// --- Deliverable templates -------------------------------------------------

export async function saveTemplateAction(
  name: string,
  dueInDays: number,
  id?: string,
): Promise<ActionState> {
  const user = await requireUser();
  if (!name.trim()) return { error: "Enter a name" };

  const data = { name: name.trim(), dueInDays: Math.max(0, dueInDays) };

  if (id) {
    const result = await prisma.deliverableTemplate.updateMany({
      where: { id, studioId: user.studioId },
      data,
    });
    if (result.count === 0) return { error: "Template not found" };
  } else {
    const count = await prisma.deliverableTemplate.count({ where: { studioId: user.studioId } });
    await prisma.deliverableTemplate.create({
      data: { ...data, studioId: user.studioId, sortOrder: count },
    });
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteTemplateAction(id: string) {
  const user = await requireUser();
  await prisma.deliverableTemplate.deleteMany({ where: { id, studioId: user.studioId } });
  revalidatePath("/settings");
}

// --- Users -----------------------------------------------------------------

export async function inviteUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!canAdminister(user.role)) return { error: "Only owners and admins can add users" };

  const parsed = inviteUserSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const v = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { studioId: user.studioId, email: v.email },
    select: { id: true },
  });
  if (existing) return { fieldErrors: { email: "Someone with this email is already in the studio" } };

  await prisma.user.create({
    data: {
      studioId: user.studioId,
      name: v.name,
      email: v.email,
      passwordHash: await hashPassword(v.password),
      // Never let an invite mint a second owner.
      role: (v.role === "OWNER" ? "ADMIN" : v.role) as Role,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/team");
  return { ok: true };
}

export async function updateUserRoleAction(id: string, role: string) {
  const user = await requireUser();
  if (!canAdminister(user.role)) return { ok: false, error: "You cannot change roles" };
  if (id === user.id) return { ok: false, error: "You cannot change your own role" };

  const target = await prisma.user.findFirst({
    where: { id, studioId: user.studioId },
    select: { role: true },
  });
  if (!target) return { ok: false, error: "User not found" };
  if (target.role === "OWNER") return { ok: false, error: "The owner's role cannot be changed" };

  await prisma.user.update({ where: { id }, data: { role: role as Role } });

  revalidatePath("/settings");
  revalidatePath("/team");
  return { ok: true };
}

export async function toggleUserActiveAction(id: string) {
  const user = await requireUser();
  if (!canAdminister(user.role)) return { ok: false, error: "You cannot change access" };
  if (id === user.id) return { ok: false, error: "You cannot disable your own account" };

  const target = await prisma.user.findFirst({
    where: { id, studioId: user.studioId },
    select: { isActive: true, role: true },
  });
  if (!target) return { ok: false, error: "User not found" };
  if (target.role === "OWNER") return { ok: false, error: "The owner cannot be disabled" };

  await prisma.user.update({ where: { id }, data: { isActive: !target.isActive } });

  revalidatePath("/settings");
  revalidatePath("/team");
  return { ok: true };
}

// --- Plan ------------------------------------------------------------------

/**
 * Switches the workspace plan. Billing is not wired up, so this only moves the
 * tier — put a payment webhook in front of it before charging anyone.
 */
export async function changePlanAction(plan: string) {
  const user = await requireUser();
  if (user.role !== "OWNER") return { ok: false, error: "Only the owner can change the plan" };

  if (!["FREE", "STUDIO", "AGENCY"].includes(plan)) {
    return { ok: false, error: "Unknown plan" };
  }

  const renewsAt = plan === "FREE" ? null : new Date(Date.now() + 365 * 86_400_000);

  await prisma.studio.update({
    where: { id: user.studioId },
    data: { plan: plan as PlanTier, planRenewsAt: renewsAt },
  });

  revalidatePath("/settings/subscription");
  revalidatePath("/settings");
  return { ok: true };
}
