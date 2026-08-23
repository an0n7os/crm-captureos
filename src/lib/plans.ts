/**
 * Plan catalogue. Prices are placeholders — set your own before charging
 * anyone, and wire `plan` changes to your payment provider's webhook rather
 * than trusting the client.
 */
export type PlanKey = "FREE" | "STUDIO" | "AGENCY";

export type Plan = {
  key: PlanKey;
  name: string;
  monthly: number;
  yearly: number;
  tagline: string;
  limits: { projects: number | null; users: number | null; leadsPerMonth: number | null };
  features: string[];
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  {
    key: "FREE",
    name: "Free",
    monthly: 0,
    yearly: 0,
    tagline: "Enough to run your first few bookings.",
    limits: { projects: 3, users: 1, leadsPerMonth: 50 },
    features: [
      "3 active projects",
      "1 user",
      "50 leads a month",
      "Enquiry pipeline and landing page",
      "Client portal",
    ],
  },
  {
    key: "STUDIO",
    name: "Studio",
    monthly: 999,
    yearly: 9_990,
    tagline: "For a working studio with a small team.",
    limits: { projects: null, users: 10, leadsPerMonth: null },
    features: [
      "Unlimited projects",
      "Up to 10 users",
      "Unlimited leads",
      "Crew scheduling with clash detection",
      "Post production board",
      "Contracts and e-signature",
      "Invoices, expenses and reports",
    ],
    highlight: true,
  },
  {
    key: "AGENCY",
    name: "Agency",
    monthly: 2_499,
    yearly: 24_990,
    tagline: "Multiple teams, higher volume, deeper reporting.",
    limits: { projects: null, users: null, leadsPerMonth: null },
    features: [
      "Everything in Studio",
      "Unlimited users",
      "Priority support",
      "Advanced reports and exports",
      "Custom deliverable templates",
    ],
  },
];

export function planFor(key: string): Plan {
  return PLANS.find((p) => p.key === key) ?? PLANS[0];
}

/** Two months free when paying yearly, expressed as a percentage. */
export function yearlySavingPercent(plan: Plan) {
  if (plan.monthly === 0) return 0;
  const fullYear = plan.monthly * 12;
  return Math.round(((fullYear - plan.yearly) / fullYear) * 100);
}
