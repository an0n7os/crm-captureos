import type { BadgeProps } from "@/components/ui/badge";

type Variant = NonNullable<BadgeProps["variant"]>;
type Meta = { label: string; variant: Variant };

export const ENQUIRY_STATUS: Record<string, Meta> = {
  NEW: { label: "New", variant: "info" },
  CONTACTED: { label: "Contacted", variant: "default" },
  FOLLOW_UP: { label: "Follow up", variant: "warning" },
  QUOTED: { label: "Quoted", variant: "primary" },
  REVISE: { label: "Revise", variant: "warning" },
  WON: { label: "Won", variant: "success" },
  LOST: { label: "Lost", variant: "danger" },
};

/** Column order for the enquiry pipeline board. */
export const ENQUIRY_PIPELINE = [
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "QUOTED",
  "REVISE",
  "WON",
  "LOST",
] as const;

export const PROJECT_STATUS: Record<string, Meta> = {
  UPCOMING: { label: "Upcoming", variant: "info" },
  IN_PROGRESS: { label: "In progress", variant: "primary" },
  SHOOT_DONE: { label: "Shoot done", variant: "default" },
  POST_PRODUCTION: { label: "Post production", variant: "warning" },
  DELIVERED: { label: "Delivered", variant: "success" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
};

export const POST_STATUS: Record<string, Meta> = {
  NOT_STARTED: { label: "Not started", variant: "default" },
  IN_PROGRESS: { label: "In progress", variant: "primary" },
  REVIEW: { label: "Review", variant: "info" },
  CHANGES_REQUESTED: { label: "Changes requested", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  DELIVERED: { label: "Delivered", variant: "success" },
};

export const POST_BOARD = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "DELIVERED",
] as const;

export const DELIVERABLE_STATUS: Record<string, Meta> = {
  PENDING: { label: "Pending", variant: "default" },
  IN_PROGRESS: { label: "In progress", variant: "primary" },
  REVIEW: { label: "Review", variant: "info" },
  APPROVED: { label: "Approved", variant: "success" },
  DELIVERED: { label: "Delivered", variant: "success" },
};

export const REQUEST_STATUS: Record<string, Meta> = {
  NEW: { label: "New", variant: "info" },
  PENDING: { label: "Pending", variant: "warning" },
  IN_PROGRESS: { label: "In progress", variant: "primary" },
  RESOLVED: { label: "Resolved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
};

export const INVOICE_STATUS: Record<string, Meta> = {
  DRAFT: { label: "Draft", variant: "default" },
  SENT: { label: "Sent", variant: "info" },
  PARTIAL: { label: "Partially paid", variant: "warning" },
  PAID: { label: "Paid", variant: "success" },
  OVERDUE: { label: "Overdue", variant: "danger" },
  CANCELLED: { label: "Cancelled", variant: "default" },
};

export const QUOTATION_STATUS: Record<string, Meta> = {
  DRAFT: { label: "Draft", variant: "default" },
  SENT: { label: "Sent", variant: "info" },
  VIEWED: { label: "Viewed", variant: "primary" },
  ACCEPTED: { label: "Accepted", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
  EXPIRED: { label: "Expired", variant: "warning" },
};

export const ASSIGNMENT_STATUS: Record<string, Meta> = {
  TENTATIVE: { label: "Tentative", variant: "warning" },
  CONFIRMED: { label: "Confirmed", variant: "success" },
  DECLINED: { label: "Declined", variant: "danger" },
  COMPLETED: { label: "Completed", variant: "default" },
};

export const PRIORITY: Record<string, Meta> = {
  LOW: { label: "Low", variant: "default" },
  NORMAL: { label: "Normal", variant: "info" },
  HIGH: { label: "High", variant: "warning" },
  URGENT: { label: "Urgent", variant: "danger" },
};

export const PAYOUT_STATUS: Record<string, Meta> = {
  PENDING: { label: "Pending", variant: "warning" },
  PAID: { label: "Paid", variant: "success" },
};

export const EVENT_TYPE_LABEL: Record<string, string> = {
  WEDDING: "Wedding",
  ENGAGEMENT: "Engagement",
  HALDI: "Haldi",
  MEHNDI: "Mehndi",
  RECEPTION: "Reception",
  SAVE_THE_DATE: "Save the date",
  PRE_WEDDING: "Pre-wedding",
  BIRTHDAY: "Birthday",
  CORPORATE: "Corporate",
  BABY_SHOWER: "Baby shower",
  HOUSE_WARMING: "House warming",
  OTHER: "Other",
};

export const SOURCE_LABEL: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  GOOGLE: "Google",
  REFERRAL: "Referral",
  WEBSITE: "Website",
  WALK_IN: "Walk-in",
  WHATSAPP: "WhatsApp",
  VENDOR: "Vendor",
  OTHER: "Other",
};

export const CREW_ROLE_LABEL: Record<string, string> = {
  PHOTOGRAPHER: "Photographer",
  CINEMATOGRAPHER: "Cinematographer",
  DRONE_PILOT: "Drone pilot",
  ASSISTANT: "Assistant",
  EDITOR: "Editor",
  ALBUM_DESIGNER: "Album designer",
  COLORIST: "Colorist",
  MAKEUP: "Makeup",
  COORDINATOR: "Coordinator",
  OTHER: "Other",
};

export const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  EQUIPMENT: "Equipment",
  TRAVEL: "Travel",
  FOOD: "Food",
  ACCOMMODATION: "Accommodation",
  FREELANCER: "Freelancer",
  ALBUM_PRINTING: "Album printing",
  SOFTWARE: "Software",
  MARKETING: "Marketing",
  RENT: "Rent",
  SALARY: "Salary",
  OTHER: "Other",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank transfer",
  CARD: "Card",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

export const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  EDITOR: "Editor",
  MEMBER: "Member",
};

/** Falls back to a neutral badge for values not in the map. */
export function meta(map: Record<string, Meta>, key: string | null | undefined): Meta {
  if (!key) return { label: "—", variant: "default" };
  return map[key] ?? { label: key, variant: "default" };
}
