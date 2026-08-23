import type * as React from "react";
import {
  CalendarDays,
  Receipt,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Key into the counts object so the sidebar can render a badge. */
  badge?: "enquiries" | "requests" | "postProduction";
};

export type NavGroup = {
  heading?: string;
  items: NavItem[];
};

/**
 * Seven destinations, one per job a studio actually does in a day. Everything
 * else — quotations, reports, client requests, imports, billing — lives inside
 * the screen it belongs to rather than competing for a sidebar row.
 */
export const NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Leads", href: "/enquiries", icon: Inbox, badge: "enquiries" },
      { label: "Quotations", href: "/quotations", icon: Receipt },
      { label: "Projects", href: "/projects", icon: FolderKanban, badge: "requests" },
      { label: "Calendar", href: "/scheduling", icon: CalendarDays },
      { label: "Editing", href: "/post-production", icon: Sparkles, badge: "postProduction" },
      { label: "Money", href: "/finances", icon: Wallet },
      { label: "Team", href: "/team", icon: Users },
    ],
  },
  {
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];

/** True when `href` is the section the current path belongs to. */
export function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";

  // Screens that were folded into a parent still light that parent up.
  const folded: Record<string, string[]> = {
    "/projects": ["/requests"],
    "/finances": ["/reports"],
    "/settings": ["/data", "/help"],
  };

  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  return (folded[href] ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
