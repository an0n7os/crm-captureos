import Link from "next/link";
import { ChevronRight, CircleHelp, CreditCard, Database } from "lucide-react";

import { Card } from "@/components/ui/card";

const LINKS = [
  {
    href: "/data",
    icon: Database,
    title: "Import & export",
    body: "Bring old records in from a spreadsheet, or take everything out as CSV.",
  },
  {
    href: "/settings/subscription",
    icon: CreditCard,
    title: "Subscription",
    body: "Your plan, what you're using against it, and your referral link.",
  },
  {
    href: "/help",
    icon: CircleHelp,
    title: "How it works",
    body: "The whole flow from first message to final payment, and where to send feedback.",
  },
] as const;

/** Screens that belong here rather than in the sidebar — used rarely, not daily. */
export function MoreLinks() {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">More</h2>

      <ul className="mt-3 divide-y divide-border">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group flex items-center gap-3.5 py-3 transition-colors"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <link.icon className="size-4 text-muted-foreground" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium group-hover:text-primary">
                  {link.title}
                </span>
                <span className="block text-xs text-muted-foreground">{link.body}</span>
              </span>

              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
