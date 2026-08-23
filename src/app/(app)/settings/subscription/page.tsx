import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Check, Gift } from "lucide-react";

import { PlanPicker } from "@/components/settings/plan-picker";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { planFor } from "@/lib/plans";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Subscription" };

export default async function SubscriptionPage() {
  const user = await requireUser();
  const current = planFor(user.studio.plan);

  const [projectCount, userCount] = await Promise.all([
    prisma.project.count({
      where: { studioId: user.studioId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    }),
    prisma.user.count({ where: { studioId: user.studioId, isActive: true } }),
  ]);

  const referralCode = user.studio.referralCode ?? user.studio.slug;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to settings
      </Link>

      <PageHeader
        title="Subscription"
        description="Your plan, what you're using, and what more costs."
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Current plan
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{current.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{current.tagline}</p>
          </div>

          {user.studio.planRenewsAt && (
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Renews
              </p>
              <p className="mt-1 text-sm font-medium">{formatDate(user.studio.planRenewsAt)}</p>
            </div>
          )}
        </div>

        <dl className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
          {[
            {
              label: "Active projects",
              used: projectCount,
              limit: current.limits.projects,
            },
            { label: "Users", used: userCount, limit: current.limits.users },
            {
              label: "Leads a month",
              used: null,
              limit: current.limits.leadsPerMonth,
            },
          ].map((row) => (
            <div key={row.label}>
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {row.label}
              </dt>
              <dd className="mt-1 text-sm font-medium tabular">
                {row.used !== null ? `${row.used} / ` : ""}
                {row.limit === null ? "Unlimited" : row.limit}
              </dd>
              {row.limit !== null && row.used !== null && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (row.used / row.limit) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </dl>
      </Card>

      <PlanPicker currentPlan={user.studio.plan} currency={user.studio.currency} />

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success-soft">
            <Gift className="size-4.5 text-success" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Refer another studio</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Share your link. When a studio signs up through it, both of you get a month on us.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
          <code className="min-w-0 flex-1 truncate text-sm">
            {process.env.NEXT_PUBLIC_APP_URL ?? ""}/signup?ref={referralCode}
          </code>
          <CopyLinkButton
            url={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/signup?ref=${referralCode}`}
            label="Copy referral link"
          />
        </div>

        <ul className="mt-4 space-y-2">
          {[
            "They sign up through your link.",
            "They finish setup and add their first project.",
            "A free month lands on both accounts.",
          ].map((step) => (
            <li key={step} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
              {step}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="border-warning/30 bg-warning-soft p-4">
        <p className="text-sm text-warning">
          Billing is not connected yet. Changing plans here updates your workspace but does not
          charge anything — wire a payment provider before you launch.
        </p>
      </Card>
    </div>
  );
}
