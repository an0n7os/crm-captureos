import Link from "next/link";
import type { Metadata } from "next";
import { Briefcase, Home, Phone, Plus, Users } from "lucide-react";

import { CrewDialog } from "@/components/team/crew-dialog";
import { CrewRowActions } from "@/components/team/crew-row-actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CREW_ROLE_LABEL, ROLE_LABEL } from "@/lib/status";
import { cn, formatCurrency, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Team" };

type SearchParams = Promise<{ type?: string }>;

export default async function TeamPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const type = sp.type ?? "all";
  const currency = user.studio.currency;

  const [crew, users] = await Promise.all([
    prisma.crewMember.findMany({
      where: {
        studioId: user.studioId,
        ...(type === "all" ? {} : { type: type as never }),
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { assignments: true } },
        payouts: { where: { status: "PENDING" }, select: { amount: true } },
      },
    }),
    prisma.user.findMany({
      where: { studioId: user.studioId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    }),
  ]);

  const inHouse = crew.filter((c) => c.type === "IN_HOUSE").length;
  const freelancers = crew.filter((c) => c.type === "FREELANCER").length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Team"
        description="Your crew, their rates and what they're owed."
        actions={
          <CrewDialog>
            <Button>
              <Plus />
              Add team member
            </Button>
          </CrewDialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total crew", value: crew.length, icon: Users },
          { label: "In house", value: inHouse, icon: Home },
          { label: "Freelancers", value: freelancers, icon: Briefcase },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-4 p-5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-secondary">
              <s.icon className="size-4.5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-0.5 text-2xl font-semibold tabular">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "all", label: "All" },
          { key: "IN_HOUSE", label: "In house" },
          { key: "FREELANCER", label: "Freelancers" },
        ].map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/team" : `/team?type=${f.key}`}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              type === f.key
                ? "border-primary bg-primary-soft text-accent-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {crew.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No team members yet"
            description="Add your photographers, cinematographers and editors — in-house or freelance."
            action={
              <CrewDialog>
                <Button>
                  <Plus />
                  Add team member
                </Button>
              </CrewDialog>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {crew.map((c) => {
            const pending = c.payouts.reduce((s, p) => s + toNumber(p.amount), 0);

            return (
              <Card key={c.id} className={cn("p-5", !c.isActive && "opacity-60")}>
                <div className="flex items-start gap-3">
                  <Avatar name={c.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {CREW_ROLE_LABEL[c.role] ?? c.role}
                    </p>
                    <Badge variant={c.type === "IN_HOUSE" ? "success" : "info"} className="mt-1.5">
                      {c.type === "IN_HOUSE" ? "In house" : "Freelancer"}
                    </Badge>
                    {!c.isActive && (
                      <Badge variant="outline" className="ml-1.5 mt-1.5">
                        Inactive
                      </Badge>
                    )}
                  </div>

                  <CrewRowActions
                    crew={{
                      id: c.id,
                      name: c.name,
                      phone: c.phone,
                      email: c.email,
                      city: c.city,
                      type: c.type,
                      role: c.role,
                      dayRate: c.dayRate?.toString() ?? null,
                      skills: c.skills,
                      notes: c.notes,
                    }}
                    isActive={c.isActive}
                  />
                </div>

                {c.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.skills.map((s) => (
                      <Badge key={s} variant="outline">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}

                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Day rate
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium tabular">
                      {c.dayRate ? formatCurrency(c.dayRate, currency) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Bookings
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium tabular">{c._count.assignments}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Owed
                    </dt>
                    <dd
                      className={cn(
                        "mt-0.5 text-sm font-medium tabular",
                        pending > 0 && "text-warning",
                      )}
                    >
                      {formatCurrency(pending, currency)}
                    </dd>
                  </div>
                </dl>

                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    className="mt-3 flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
                  >
                    <Phone className="size-3.5" />
                    {c.phone}
                  </a>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* App users are separate from crew: only these people can sign in. */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">App users</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              People who can sign in to this workspace.
            </p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href="/settings/users">Manage users</Link>
          </Button>
        </div>

        <ul className="mt-4 divide-y divide-border">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-2.5">
              <Avatar name={u.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              {!u.isActive && <Badge variant="outline">Disabled</Badge>}
              <Badge variant={u.role === "OWNER" ? "primary" : "default"}>
                {ROLE_LABEL[u.role] ?? u.role}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
