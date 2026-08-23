import { z } from "zod";

const trimmed = z.string().trim();

export const signupSchema = z.object({
  studioName: trimmed.min(2, "Studio name is too short").max(80),
  name: trimmed.min(2, "Enter your name").max(80),
  email: trimmed.email("Enter a valid email").toLowerCase(),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

export const loginSchema = z.object({
  email: trimmed.email("Enter a valid email").toLowerCase(),
  password: z.string().min(1, "Enter your password"),
});

/** Empty strings from unfilled form inputs become undefined, not "". */
const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  trimmed.max(300).optional(),
);

const optionalDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.coerce.date().optional(),
);

const optionalAmount = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.coerce.number().min(0).optional(),
);

export const enquirySchema = z.object({
  contactName: trimmed.min(2, "Enter the contact name").max(120),
  partnerName: optionalText,
  phone: optionalText,
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    trimmed.email("Enter a valid email").optional(),
  ),
  city: optionalText,
  eventType: z.string().default("WEDDING"),
  eventDate: optionalDate,
  venue: optionalText,
  guestCount: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce.number().int().min(0).optional(),
  ),
  budgetMin: optionalAmount,
  budgetMax: optionalAmount,
  status: z.string().default("NEW"),
  source: z.string().default("OTHER"),
  nextFollowUpAt: optionalDate,
  ownerId: optionalText,
  notes: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    trimmed.max(4000).optional(),
  ),
  lostReason: optionalText,
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

const requiredAmount = z.coerce.number().min(0, "Enter a valid amount");

export const projectSchema = z.object({
  clientId: trimmed.min(1, "Choose a client"),
  name: trimmed.min(2, "Enter a project name").max(140),
  eventType: z.string().default("WEDDING"),
  status: z.string().default("UPCOMING"),
  venue: optionalText,
  city: optionalText,
  packageValue: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? 0 : v),
    requiredAmount.default(0),
  ),
  managerId: optionalText,
  notes: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    trimmed.max(4000).optional(),
  ),
});

export const clientSchema = z.object({
  name: trimmed.min(2, "Enter the client name").max(120),
  partnerName: optionalText,
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    trimmed.email("Enter a valid email").optional(),
  ),
  phone: optionalText,
  city: optionalText,
  addressLine: optionalText,
  instagram: optionalText,
  notes: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    trimmed.max(4000).optional(),
  ),
});

export const eventDaySchema = z.object({
  projectId: trimmed.min(1),
  title: trimmed.min(1, "Enter a title").max(120),
  eventType: z.string().default("WEDDING"),
  date: z.coerce.date({ message: "Choose a date" }),
  startTime: optionalText,
  endTime: optionalText,
  venue: optionalText,
  city: optionalText,
  mapUrl: optionalText,
  notes: optionalText,
});

export const deliverableSchema = z.object({
  projectId: trimmed.min(1),
  name: trimmed.min(1, "Enter a name").max(140),
  description: optionalText,
  quantity: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? 1 : v),
    z.coerce.number().int().min(1).default(1),
  ),
  status: z.string().default("PENDING"),
  dueDate: optionalDate,
  deliveryUrl: optionalText,
});

export const crewSchema = z.object({
  name: trimmed.min(2, "Enter a name").max(120),
  phone: optionalText,
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    trimmed.email("Enter a valid email").optional(),
  ),
  city: optionalText,
  type: z.string().default("IN_HOUSE"),
  role: z.string().default("PHOTOGRAPHER"),
  dayRate: optionalAmount,
  skills: optionalText,
  notes: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    trimmed.max(2000).optional(),
  ),
});

export const postTaskSchema = z.object({
  projectId: trimmed.min(1, "Choose a project"),
  deliverableId: optionalText,
  title: trimmed.min(2, "Enter a title").max(160),
  description: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    trimmed.max(4000).optional(),
  ),
  status: z.string().default("NOT_STARTED"),
  priority: z.string().default("NORMAL"),
  assigneeId: optionalText,
  dueDate: optionalDate,
});

export const requestSchema = z.object({
  projectId: trimmed.min(1, "Choose a project"),
  taskId: optionalText,
  title: trimmed.min(2, "Enter a title").max(160),
  description: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    trimmed.max(4000).optional(),
  ),
  status: z.string().default("NEW"),
  priority: z.string().default("NORMAL"),
});

/** Line items arrive as parallel arrays from repeated form fields. */
const lineItems = z
  .object({
    itemName: z.union([z.string(), z.array(z.string())]).optional(),
    itemQty: z.union([z.string(), z.array(z.string())]).optional(),
    itemPrice: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .transform((v) => {
    const names = toArray(v.itemName);
    const qtys = toArray(v.itemQty);
    const prices = toArray(v.itemPrice);

    return names
      .map((name, i) => ({
        name: name.trim(),
        quantity: Math.max(1, Number(qtys[i] ?? 1) || 1),
        unitPrice: Math.max(0, Number(prices[i] ?? 0) || 0),
      }))
      .filter((item) => item.name.length > 0);
  });

function toArray(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

const documentBase = {
  title: optionalText,
  notes: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    trimmed.max(4000).optional(),
  ),
  terms: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    trimmed.max(4000).optional(),
  ),
  discount: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? 0 : v),
    z.coerce.number().min(0).default(0),
  ),
  taxPercent: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? 0 : v),
    z.coerce.number().min(0).max(100).default(0),
  ),
};

export const quotationSchema = z
  .object({
    enquiryId: optionalText,
    clientId: optionalText,
    status: z.string().default("DRAFT"),
    validUntil: optionalDate,
    ...documentBase,
  })
  .and(lineItems.transform((items) => ({ items })));

export const invoiceSchema = z
  .object({
    clientId: trimmed.min(1, "Choose a client"),
    projectId: optionalText,
    status: z.string().default("DRAFT"),
    issueDate: optionalDate,
    dueDate: optionalDate,
    ...documentBase,
  })
  .and(lineItems.transform((items) => ({ items })));

export const paymentSchema = z.object({
  invoiceId: trimmed.min(1),
  amount: requiredAmount.refine((n) => n > 0, "Enter an amount"),
  method: z.string().default("UPI"),
  paidOn: optionalDate,
  reference: optionalText,
  note: optionalText,
});

export const expenseSchema = z.object({
  title: trimmed.min(2, "Enter a title").max(160),
  category: z.string().default("OTHER"),
  amount: requiredAmount.refine((n) => n > 0, "Enter an amount"),
  spentOn: optionalDate,
  projectId: optionalText,
  vendor: optionalText,
  method: z.string().default("CASH"),
  note: optionalText,
});

export const payoutSchema = z.object({
  crewId: trimmed.min(1, "Choose a crew member"),
  projectId: optionalText,
  amount: requiredAmount.refine((n) => n > 0, "Enter an amount"),
  status: z.string().default("PENDING"),
  method: z.string().default("UPI"),
  note: optionalText,
});

export const packageSchema = z.object({
  name: trimmed.min(2, "Enter a name").max(140),
  description: optionalText,
  price: requiredAmount,
  inclusions: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    trimmed.max(2000).optional(),
  ),
});

export const studioSettingsSchema = z.object({
  name: trimmed.min(2, "Enter the studio name").max(120),
  logoUrl: optionalText,
  whatsappNumber: optionalText,
  ownerName: optionalText,
  avatarUrl: optionalText,
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    trimmed.email("Enter a valid email").optional(),
  ),
  phone: optionalText,
  website: optionalText,
  gstNumber: optionalText,
  addressLine: optionalText,
  city: optionalText,
  state: optionalText,
  pincode: optionalText,
  currency: z.string().default("INR"),
});

export const inviteUserSchema = z.object({
  name: trimmed.min(2, "Enter a name").max(80),
  email: trimmed.email("Enter a valid email").toLowerCase(),
  password: z.string().min(8, "Use at least 8 characters").max(72),
  role: z.string().default("MEMBER"),
});

/** Reads a FormData into a plain object Zod can parse. */
export function formToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    obj[key] = value;
  }
  return obj;
}

export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** Flattens Zod issues into the shape our forms render. */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
