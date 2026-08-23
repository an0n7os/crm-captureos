import Link from "next/link";
import type { Metadata } from "next";
import {
  CalendarDays,
  FolderKanban,
  Inbox,
  MessageSquare,
  Receipt,
  Share2,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import { FeedbackCard } from "@/components/shell/help-widget";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "How it works" };

const FLOW = [
  {
    icon: Inbox,
    title: "A lead comes in",
    body: "Someone fills your landing page form, or you add them by hand. They land in Enquiries as New.",
    href: "/enquiries",
    action: "Open enquiries",
  },
  {
    icon: Receipt,
    title: "You quote them",
    body: "Build a quotation from your saved packages and send the link. They accept or decline on the page itself.",
    href: "/quotations/new",
    action: "Build a quotation",
  },
  {
    icon: FolderKanban,
    title: "They book",
    body: "Hit Convert to project on the enquiry. The client, the project, the event day and your default deliverables are all created at once.",
    href: "/projects",
    action: "See projects",
  },
  {
    icon: CalendarDays,
    title: "You crew it",
    body: "Add each event day, then assign photographers and cinematographers per day. Double bookings and leave clashes are refused.",
    href: "/scheduling",
    action: "Open the calendar",
  },
  {
    icon: Sparkles,
    title: "Editing runs",
    body: "Every edit is a card on the post production board. Drag it along, attach review links, share versions with the client.",
    href: "/post-production",
    action: "Open the board",
  },
  {
    icon: MessageSquare,
    title: "The client responds",
    body: "They raise revision requests from their portal. Each one is a thread you reply to and close off.",
    href: "/requests",
    action: "See requests",
  },
  {
    icon: Wallet,
    title: "You get paid",
    body: "Raise invoices, record payments as they land, log expenses and crew payouts. Profit per project updates itself.",
    href: "/finances",
    action: "Open finances",
  },
];

export default async function HelpPage() {
  const user = await requireUser();
  const leadLink = user.studio.enquirySlug ? `/lead/${user.studio.enquirySlug}` : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader
        title="How it works"
        description="The whole flow, from first message to final payment."
      />

      <ol className="flex flex-col gap-3">
        {FLOW.map((step, index) => (
          <li key={step.title}>
            <Card className="flex flex-wrap items-start gap-4 p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                <step.icon className="size-4.5 text-accent-foreground" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  <span className="mr-2 text-muted-foreground tabular">{index + 1}.</span>
                  {step.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>

              <Button variant="outline" size="sm" asChild>
                <Link href={step.href}>{step.action}</Link>
              </Button>
            </Card>
          </li>
        ))}
      </ol>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">Things worth setting up once</h2>
        <ul className="mt-4 space-y-3">
          {[
            {
              icon: Share2,
              title: "Your enquiry link",
              body: leadLink
                ? `Share ${leadLink} in your Instagram bio — submissions land straight in your pipeline.`
                : "Set up a public enquiry page so leads reach you without a DM.",
              href: "/enquiries?section=landing",
            },
            {
              icon: Receipt,
              title: "Packages",
              body: "Save your standard packages once. Quotes and invoices then take one click.",
              href: "/settings",
            },
            {
              icon: Users,
              title: "Your crew",
              body: "Add in-house staff and freelancers with their day rates, so scheduling and payouts stay accurate.",
              href: "/team",
            },
          ].map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <item.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <Link href={item.href} className="text-sm font-medium hover:text-primary">
                  {item.title}
                </Link>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <FeedbackCard whatsappNumber={user.studio.whatsappNumber ?? user.studio.phone} />
    </div>
  );
}
