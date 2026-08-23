import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react";

import { ContractTab } from "@/components/projects/contract-tab";
import { DeliverablesSection } from "@/components/projects/deliverables-section";
import { EventDaysSection } from "@/components/projects/event-days-section";
import { MoodboardTab } from "@/components/projects/moodboard-tab";
import { ProjectStatusSelect } from "@/components/projects/project-status-select";
import { ProjectTabs, normalizeTab } from "@/components/projects/project-tabs";
import { ShareBar } from "@/components/projects/share-bar";
import { Avatar, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DetailRow, EmptyState, PageHeader } from "@/components/ui/misc";
import { defaultContractBody } from "@/lib/defaults";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  ASSIGNMENT_STATUS,
  CREW_ROLE_LABEL,
  EVENT_TYPE_LABEL,
  INVOICE_STATUS,
  POST_STATUS,
  PRIORITY,
  QUOTATION_STATUS,
  meta,
} from "@/lib/status";
import { formatCurrency, formatDate, relativeDays, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Project" };

type SearchParams = Promise<{ tab?: string }>;

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const tab = normalizeTab((await searchParams).tab);
  const user = await requireUser();
  const currency = user.studio.currency;

  const project = await prisma.project.findFirst({
    where: { id, studioId: user.studioId },
    include: {
      client: true,
      manager: { select: { id: true, name: true } },
      contract: true,
      moodboardItems: { orderBy: { sortOrder: "asc" } },
      eventDays: {
        orderBy: { date: "asc" },
        include: { assignments: { include: { crew: { select: { id: true, name: true, type: true } } } } },
      },
      deliverables: { orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }] },
      postTasks: { orderBy: { createdAt: "asc" }, include: { assignee: { select: { name: true } } } },
      invoices: { orderBy: { createdAt: "desc" } },
      expenses: { orderBy: { spentOn: "desc" } },
      payouts: { include: { crew: { select: { name: true } } } },
    },
  });

  if (!project) notFound();

  const quotations = await prisma.quotation.findMany({
    where: {
      studioId: user.studioId,
      OR: [{ clientId: project.clientId }, ...(project.enquiryId ? [{ enquiryId: project.enquiryId }] : [])],
    },
    orderBy: { createdAt: "desc" },
  });

  const invoiced = project.invoices
    .filter((i) => i.status !== "DRAFT" && i.status !== "CANCELLED")
    .reduce((s, i) => s + toNumber(i.total), 0);
  const received = project.invoices.reduce((s, i) => s + toNumber(i.amountPaid), 0);
  const expenses = project.expenses.reduce((s, e) => s + toNumber(e.amount), 0);
  const pendingPayouts = project.payouts
    .filter((p) => p.status === "PENDING")
    .reduce((s, p) => s + toNumber(p.amount), 0);
  const profit = received - expenses;

  const assignments = project.eventDays.flatMap((d) =>
    d.assignments.map((a) => ({ ...a, dayTitle: d.title, date: d.date })),
  );

  // A step counts as done only when every part folded into it has real data.
  const done = {
    overview: Boolean(project.client.phone || project.client.email || project.clientWhatsapp),
    schedule: project.eventDays.length > 0 && assignments.length > 0,
    deliverables: project.deliverables.length > 0,
    money: project.invoices.length > 0,
    contract: project.contract?.status === "SIGNED",
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to projects
      </Link>

      <PageHeader
        title={project.name}
        description={`${project.code} · ${EVENT_TYPE_LABEL[project.eventType] ?? project.eventType}${
          project.startDate ? ` · ${formatDate(project.startDate)}` : ""
        }`}
        actions={
          <>
            <ProjectStatusSelect id={project.id} status={project.status} />
            <Button variant="outline" asChild>
              <Link href={`/projects/${project.id}/edit`}>
                <Pencil />
                Edit
              </Link>
            </Button>
          </>
        }
      />

      <ShareBar projectId={project.id} shareToken={project.shareToken} pin={project.portalPin} />

      <ProjectTabs projectId={project.id} active={tab} done={done} />

      {/* ---------------------------------------------------------------- */}
      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card className="p-5">
              <h2 className="text-sm font-semibold">Project overview</h2>
              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                {[
                  ["Project name", project.name],
                  ["Project type", EVENT_TYPE_LABEL[project.eventType] ?? project.eventType],
                  ["Client name", project.client.name],
                  ["Client WhatsApp", project.clientWhatsapp ?? project.client.phone ?? "—"],
                  ["Client email", project.client.email ?? "—"],
                  ["Venue", project.venue ?? "—"],
                  ["City", project.city ?? "—"],
                  [
                    "Event dates",
                    project.startDate
                      ? `${formatDate(project.startDate)}${
                          project.endDate && +project.endDate !== +project.startDate
                            ? ` – ${formatDate(project.endDate)}`
                            : ""
                        }`
                      : "—",
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm">{value}</dd>
                  </div>
                ))}
              </dl>

              {project.whatsappGroupUrl && (
                <Button variant="outline" size="sm" className="mt-5" asChild>
                  <a href={project.whatsappGroupUrl} target="_blank" rel="noreferrer">
                    <MessageCircle />
                    Open WhatsApp group
                  </a>
                </Button>
              )}
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Package value", value: toNumber(project.packageValue), tone: "" },
                { label: "Received", value: received, tone: "text-success" },
                { label: "Balance due", value: Math.max(invoiced - received, 0), tone: "text-warning" },
                {
                  label: "Profit so far",
                  value: profit,
                  tone: profit >= 0 ? "text-success" : "text-danger",
                },
              ].map((stat) => (
                <Card key={stat.label} className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className={`mt-1.5 text-xl font-semibold tabular ${stat.tone}`}>
                    {formatCurrency(stat.value, currency)}
                  </p>
                </Card>
              ))}
            </div>

            {project.notes && (
              <Card className="p-5">
                <h2 className="text-sm font-semibold">Notes</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {project.notes}
                </p>
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <Card className="p-5">
              <h2 className="text-sm font-semibold">Client</h2>
              <div className="mt-4 flex items-center gap-3">
                <Avatar name={project.client.name} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {project.client.name}
                    {project.client.partnerName ? ` & ${project.client.partnerName}` : ""}
                  </p>
                  {project.client.city && (
                    <p className="text-xs text-muted-foreground">{project.client.city}</p>
                  )}
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                {project.client.phone && (
                  <a
                    href={`tel:${project.client.phone}`}
                    className="flex items-center gap-2.5 text-sm hover:text-primary"
                  >
                    <Phone className="size-4 text-muted-foreground" />
                    {project.client.phone}
                  </a>
                )}
                {project.client.email && (
                  <a
                    href={`mailto:${project.client.email}`}
                    className="flex items-center gap-2.5 text-sm hover:text-primary"
                  >
                    <Mail className="size-4 text-muted-foreground" />
                    <span className="truncate">{project.client.email}</span>
                  </a>
                )}
              </div>

              {(project.clientWhatsapp ?? project.client.phone) && (
                <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                  <a
                    href={`https://wa.me/${(project.clientWhatsapp ?? project.client.phone ?? "").replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle />
                    Message on WhatsApp
                  </a>
                </Button>
              )}

              <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                <Link href={`/portal/${project.client.portalToken}`} target="_blank">
                  <ExternalLink />
                  Full client portal
                </Link>
              </Button>
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-semibold">Details</h2>
              <div className="mt-3 divide-y divide-border">
                <DetailRow label="Manager">
                  {project.manager ? (
                    <span className="inline-flex items-center gap-2">
                      <Avatar name={project.manager.name} size="sm" />
                      {project.manager.name}
                    </span>
                  ) : (
                    "Unassigned"
                  )}
                </DetailRow>
                <DetailRow label="Expenses">
                  <span className="text-danger">{formatCurrency(expenses, currency)}</span>
                </DetailRow>
                <DetailRow label="Pending payouts">
                  <span className={pendingPayouts > 0 ? "text-warning" : ""}>
                    {formatCurrency(pendingPayouts, currency)}
                  </span>
                </DetailRow>
                <DetailRow label="Created">{formatDate(project.createdAt)}</DetailRow>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {tab === "schedule" && (
        <EventDaysSection
          projectId={project.id}
          eventDays={project.eventDays.map((day) => ({
            id: day.id,
            title: day.title,
            eventType: day.eventType,
            date: day.date.toISOString(),
            startTime: day.startTime,
            endTime: day.endTime,
            venue: day.venue,
            city: day.city,
            notes: day.notes,
            crewNames: day.assignments.map((a) => a.crew.name),
          }))}
        />
      )}

      {/* ---------------------------------------------------------------- */}
      {tab === "money" && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Quotations</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Agreed package value: {formatCurrency(project.packageValue, currency)}
              </p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/quotations/new">New quotation</Link>
            </Button>
          </div>

          {quotations.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No quotations for this client"
              description="Build one from your saved packages and share the link."
            />
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {quotations.map((q) => {
                const m = meta(QUOTATION_STATUS, q.status);
                return (
                  <li key={q.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/quotations/${q.id}`}
                        className="block truncate text-sm font-medium hover:text-primary"
                      >
                        {q.number}
                        {q.title ? ` · ${q.title}` : ""}
                      </Link>
                      <p className="text-xs text-muted-foreground">{formatDate(q.createdAt)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular">
                      {formatCurrency(q.total, currency)}
                    </span>
                    <Badge variant={m.variant}>{m.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {/* ---------------------------------------------------------------- */}
      {tab === "deliverables" && (
        <div className="flex flex-col gap-4">
          <DeliverablesSection
            projectId={project.id}
            deliverables={project.deliverables.map((d) => ({
              id: d.id,
              name: d.name,
              description: d.description,
              quantity: d.quantity,
              status: d.status,
              dueDate: d.dueDate?.toISOString() ?? null,
              deliveryUrl: d.deliveryUrl,
            }))}
          />

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Post production</h2>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/post-production?projectId=${project.id}`}>Open board</Link>
              </Button>
            </div>

            {project.postTasks.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No edit tasks yet"
                description="Add tasks from the post production board to track editing."
              />
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {project.postTasks.map((task) => {
                  const m = meta(POST_STATUS, task.status);
                  const p = meta(PRIORITY, task.priority);

                  return (
                    <li key={task.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.assignee?.name ?? "Unassigned"}
                          {task.dueDate ? ` · due ${relativeDays(task.dueDate)}` : ""}
                        </p>
                      </div>
                      {task.priority !== "NORMAL" && <Badge variant={p.variant}>{p.label}</Badge>}
                      <Badge variant={m.variant}>{m.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {tab === "money" && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "Invoiced", value: invoiced, tone: "" },
              { label: "Received", value: received, tone: "text-success" },
              { label: "Balance", value: Math.max(invoiced - received, 0), tone: "text-warning" },
              { label: "Expenses", value: expenses, tone: "text-danger" },
            ].map((s) => (
              <Card key={s.label} className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </p>
                <p className={`mt-1.5 text-xl font-semibold tabular ${s.tone}`}>
                  {formatCurrency(s.value, currency)}
                </p>
              </Card>
            ))}
          </div>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Invoices</h2>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/finances/invoices/new?projectId=${project.id}`}>New invoice</Link>
              </Button>
            </div>

            {project.invoices.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No invoices yet"
                description="Raise one to start tracking payments for this project."
              />
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {project.invoices.map((inv) => {
                  const m = meta(INVOICE_STATUS, inv.status);
                  const balance = toNumber(inv.total) - toNumber(inv.amountPaid);

                  return (
                    <li key={inv.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/finances/invoices/${inv.id}`}
                          className="block truncate text-sm font-medium hover:text-primary"
                        >
                          {inv.number}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {inv.dueDate ? `Due ${formatDate(inv.dueDate)}` : "No due date"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium tabular">
                          {formatCurrency(inv.total, currency)}
                        </p>
                        {balance > 0 && (
                          <p className="text-xs text-warning tabular">
                            {formatCurrency(balance, currency)} due
                          </p>
                        )}
                      </div>
                      <Badge variant={m.variant}>{m.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-6 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Expenses</h2>
              <Button size="sm" variant="outline" asChild>
                <Link href="/finances?tab=expenses">Add expense</Link>
              </Button>
            </div>

            {project.expenses.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No expenses recorded against this project.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {project.expenses.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(e.spentOn)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular text-danger">
                      −{formatCurrency(e.amount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {tab === "schedule" && (
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Crew on this project</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Assign people per event day from the scheduling calendar.
                </p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/scheduling">Open calendar</Link>
              </Button>
            </div>

            {assignments.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nobody assigned yet"
                description="Add event days first, then book your crew onto each one."
              />
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {assignments.map((a) => {
                  const m = meta(ASSIGNMENT_STATUS, a.status);
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-2.5">
                      <Avatar name={a.crew.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.crew.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {CREW_ROLE_LABEL[a.role] ?? a.role} · {a.dayTitle} ·{" "}
                          {formatDate(a.date)}
                        </p>
                      </div>
                      {a.agreedFee && (
                        <span className="text-sm tabular">
                          {formatCurrency(a.agreedFee, currency)}
                        </span>
                      )}
                      <Badge variant={m.variant}>{m.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {project.payouts.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold">Crew payouts</h2>
              <ul className="mt-3 divide-y divide-border">
                {project.payouts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="truncate text-sm">{p.crew.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-medium tabular">
                        {formatCurrency(p.amount, currency)}
                      </span>
                      <Badge variant={p.status === "PAID" ? "success" : "warning"}>
                        {p.status === "PAID" ? "Paid" : "Pending"}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {tab === "contract" && (
        <ContractTab
          projectId={project.id}
          suggestedTitle={`Coverage agreement — ${project.name}`}
          suggestedBody={defaultContractBody({
            studioName: user.studio.name,
            clientName: project.client.name,
            projectName: project.name,
            eventDates: project.startDate ? formatDate(project.startDate) : "",
            venue: project.venue ?? "",
            amount: formatCurrency(project.packageValue, currency),
          })}
          contract={
            project.contract
              ? {
                  title: project.contract.title,
                  body: project.contract.body,
                  status: project.contract.status,
                  shareToken: project.contract.shareToken,
                  signerName: project.contract.signerName,
                  signedAt: project.contract.signedAt?.toISOString() ?? null,
                }
              : null
          }
        />
      )}

      {/* ---------------------------------------------------------------- */}
      {tab === "deliverables" && (
        <MoodboardTab
          projectId={project.id}
          items={project.moodboardItems.map((m) => ({
            id: m.id,
            imageUrl: m.imageUrl,
            linkUrl: m.linkUrl,
            caption: m.caption,
          }))}
        />
      )}

      {/* ---------------------------------------------------------------- */}
      {tab === "schedule" && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold">Project calendar</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Every event day and deliverable deadline in date order.
          </p>

          {project.eventDays.length === 0 && project.deliverables.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nothing scheduled"
              description="Add event days and deliverable due dates to build the timeline."
            />
          ) : (
            <ol className="mt-5 space-y-3">
              {[
                ...project.eventDays.map((d) => ({
                  id: d.id,
                  kind: "Event" as const,
                  title: d.title,
                  subtitle: d.venue ?? "",
                  date: d.date,
                })),
                ...project.deliverables
                  .filter((d) => d.dueDate)
                  .map((d) => ({
                    id: d.id,
                    kind: "Deliverable" as const,
                    title: d.name,
                    subtitle: d.status === "DELIVERED" ? "Delivered" : "Due",
                    date: d.dueDate!,
                  })),
              ]
                .sort((a, b) => +a.date - +b.date)
                .map((item) => (
                  <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3">
                    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary">
                      <span className="text-sm font-semibold leading-none tabular">
                        {new Date(item.date).getDate()}
                      </span>
                      <span className="mt-0.5 text-[10px] uppercase text-muted-foreground">
                        {new Date(item.date).toLocaleString("en-IN", { month: "short" })}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.subtitle}
                        {item.subtitle ? " · " : ""}
                        {relativeDays(item.date)}
                      </p>
                    </div>

                    <Badge variant={item.kind === "Event" ? "primary" : "outline"}>
                      {item.kind}
                    </Badge>
                  </li>
                ))}
            </ol>
          )}

          {project.eventDays.some((d) => d.assignments.length > 0) && (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="text-sm font-semibold">Crew per day</h3>
              <ul className="mt-3 space-y-2.5">
                {project.eventDays.map((d) => (
                  <li key={d.id} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs text-muted-foreground">
                      {formatDate(d.date)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{d.title}</span>
                    {d.assignments.length > 0 ? (
                      <AvatarGroup names={d.assignments.map((a) => a.crew.name)} />
                    ) : (
                      <span className="text-xs text-warning">No crew</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
