"use server";

import { redirect } from "next/navigation";

import { createSessionCookie, destroySessionCookie, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import {
  formToObject,
  loginSchema,
  signupSchema,
  zodFieldErrors,
  type ActionState,
} from "@/lib/validators";

/** Default catalogue a brand new studio starts with, so nothing is empty on day one. */
const STARTER_PACKAGES = [
  {
    name: "Silver — Photo only",
    price: 65_000,
    inclusions: ["1 photographer", "Candid coverage", "300 edited photos", "Online gallery"],
  },
  {
    name: "Gold — Photo + Video",
    price: 1_25_000,
    inclusions: [
      "2 photographers",
      "1 cinematographer",
      "500 edited photos",
      "Highlight film (5 min)",
      "Premium album (30 sheets)",
    ],
  },
  {
    name: "Platinum — Full production",
    price: 2_40_000,
    inclusions: [
      "3 photographers",
      "2 cinematographers",
      "Drone coverage",
      "Teaser + highlight + full film",
      "2 premium albums",
      "Same-day edit",
    ],
  },
];

/** Crew roles most wedding studios quote for, offered from day one. */
const STARTER_SERVICES = [
  { name: "Candid photographer", unitPrice: 12_000 },
  { name: "Traditional photographer", unitPrice: 9_000 },
  { name: "Candid cinematographer", unitPrice: 15_000 },
  { name: "Traditional videographer", unitPrice: 10_000 },
  { name: "Drone pilot", unitPrice: 10_000 },
  { name: "Assistant", unitPrice: 4_000 },
];

const STARTER_DELIVERABLES = [
  { name: "Edited photos", dueInDays: 30 },
  { name: "Highlight film", dueInDays: 45 },
  { name: "Teaser reel", dueInDays: 10 },
  { name: "Premium album", dueInDays: 75 },
  { name: "Full ceremony film", dueInDays: 60 },
];

async function uniqueSlug(base: string) {
  const root = slugify(base) || "studio";
  let candidate = root;
  let n = 1;
  while (await prisma.studio.findUnique({ where: { slug: candidate } })) {
    candidate = `${root}-${++n}`;
  }
  return candidate;
}

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const { studioName, name, email, password } = parsed.data;

  const slug = await uniqueSlug(studioName);
  const passwordHash = await hashPassword(password);

  const studio = await prisma.studio.create({
    data: {
      name: studioName,
      slug,
      email,
      users: {
        create: { name, email, passwordHash, role: "OWNER" },
      },
      packages: {
        create: STARTER_PACKAGES.map((p, i) => ({
          name: p.name,
          price: p.price,
          inclusions: p.inclusions,
          sortOrder: i,
        })),
      },
      deliverableTemplates: {
        create: STARTER_DELIVERABLES.map((d, i) => ({
          name: d.name,
          dueInDays: d.dueInDays,
          sortOrder: i,
        })),
      },
      serviceItems: {
        create: STARTER_SERVICES.map((s, i) => ({
          name: s.name,
          unitPrice: s.unitPrice,
          sortOrder: i,
        })),
      },
    },
    include: { users: true },
  });

  const owner = studio.users[0];
  await createSessionCookie({ userId: owner.id, studioId: studio.id, role: owner.role });

  redirect("/onboarding/profile");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const { email, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { email, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  // Same message either way so the form does not reveal which emails exist.
  const invalid = { error: "Email or password is incorrect" };
  if (!user) return invalid;
  if (!(await verifyPassword(password, user.passwordHash))) return invalid;

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSessionCookie({ userId: user.id, studioId: user.studioId, role: user.role });

  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySessionCookie();
  redirect("/login");
}
