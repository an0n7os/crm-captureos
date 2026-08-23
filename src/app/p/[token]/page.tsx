import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Camera, CalendarDays, FileSignature, MapPin } from "lucide-react";

import { PinGate } from "@/components/public/pin-gate";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { hasProjectPinAccess } from "@/lib/actions/portal-auth";
import { prisma } from "@/lib/prisma";
import { DELIVERABLE_STATUS, EVENT_TYPE_LABEL, PROJECT_STATUS, meta } from "@/lib/status";
import { formatCurrency, formatDate, relativeDays, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Your project", robots: { index: false } };

/** Single-project client view, gated by the project's optional PIN. */
export default async function ProjectSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    include: {
      studio: true,
      client: { select: { name: true, partnerName: true } },
      contract: { select: { status: true, title: true, shareToken: true } },
      eventDays: { orderBy: { date: "asc" } },
      deliverables: { orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }] },
      moodboardItems: { orderBy: { sortOrder: "asc" } },
      invoices: {
        where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
        select: { id: true, number: true, total: true, amountPaid: true, dueDate: true, shareToken: true },
      },
      postTasks: {
        include: { versions: { where: { isShared: true }, orderBy: { version: "desc" } } },
      },
    },
  });

  if (!project) notFound();

  if (!(await hasProjectPinAccess(token, project.portalPin))) {
    return <PinGate token={token} studioName={project.studio.name} />;
  }

  const currency = project.studio.currency;
  const invoiced = project.invoices.reduce((s, i) => s + toNumber(i.total), 0);
  const paid = project.invoices.reduce((s, i) => s + toNumber(i.amountPaid), 0);
  const m = meta(PROJECT_STATUS, project.status);

  const sharedVersions = project.postTasks.flatMap((t) =>
    t.versions.map((v) => ({ ...v, taskTitle: t.title })),
  );

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-2.5 px-4 py-5 sm:px-6">
          {project.studio.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.studio.logoUrl}
              alt=""
              className="size-9 rounded-lg object-cover"
            />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Camera className="size-4.5" />
            </span>
          )}
          <div>
            <p className="text-sm font-semibold tracking-tight">{project.studio.name}</p>
            <p className="text-xs text-muted-foreground">Project details</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {EVENT_TYPE_LABEL[project.eventType] ?? project.eventType}
              {project.venue ? ` · ${project.venue}` : ""}
            </p>
          </div>
          <Badge variant={m.variant}>{m.label}</Badge>
        </div>

        {project.contract && project.contract.status !== "SIGNED" && (
          <Card className="flex flex-wrap items-center gap-3 border-info/30 bg-info-soft p-4">
            <FileSignature className="size-4 shrink-0 text-info" />
            <p className="min-w-0 flex-1 text-sm text-info">
              {project.contract.title} is waiting for your signature.
            </p>
            <a
              href={`/c/${project.contract.shareToken}`}
              className="text-sm font-medium text-info underline-offset-4 hover:underline"
            >
              Review and sign
            </a>
          </Card>
        )}

        {project.eventDays.length > 0 && (
          <Card className="p-6">
            <h2 className="text-sm font-semibold">Your event days</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {project.eventDays.map((day) => (
                <li key={day.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary">
                    <span className="text-sm font-semibold leading-none tabular">
                      {new Date(day.date).getDate()}
                    </span>
                    <span className="mt-0.5 text-[10px] uppercase text-muted-foreground">
                      {new Date(day.date).toLocaleString("en-IN", { month: "short" })}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{day.title}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      {day.venue ? (
                        <>
                          <MapPin className="size-3" />
                          {day.venue}
                        </>
                      ) : (
                        <>
                          <CalendarDays className="size-3" />
                          {formatDate(day.date)}
                        </>
                      )}
                      {day.startTime ? ` · ${day.startTime}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {project.deliverables.length > 0 && (
          <Card className="p-6">
            <h2 className="text-sm font-semibold">What you'll receive</h2>
            <ul className="mt-3 divide-y divide-border">
              {project.deliverables.map((d) => {
                const dm = meta(DELIVERABLE_STATUS, d.status);
                return (
                  <li key={d.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.name}</p>
                      {d.dueDate && (
                        <p className="text-xs text-muted-foreground">
                          Expected {formatDate(d.dueDate)}
                        </p>
                      )}
                    </div>
                    {d.deliveryUrl && d.status === "DELIVERED" && (
                      <a
                        href={d.deliveryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Open
                      </a>
                    )}
                    <Badge variant={dm.variant}>{dm.label}</Badge>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {sharedVersions.length > 0 && (
          <Card className="p-6">
            <h2 className="text-sm font-semibold">Shared for review</h2>
            <ul className="mt-3 divide-y divide-border">
              {sharedVersions.map((v) => (
                <li key={v.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold">
                    v{v.version}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{v.taskTitle}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {v.note ?? ""} {v.note ? "· " : ""}
                      {relativeDays(v.createdAt)}
                    </p>
                  </div>
                  {v.url && (
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {project.moodboardItems.length > 0 && (
          <Card className="p-6">
            <h2 className="text-sm font-semibold">Moodboard</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {project.moodboardItems.map((item) =>
                item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={item.id}
                    src={item.imageUrl}
                    alt={item.caption ?? ""}
                    className="aspect-square w-full rounded-lg border border-border object-cover"
                  />
                ) : (
                  <a
                    key={item.id}
                    href={item.linkUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex aspect-square w-full items-center justify-center rounded-lg border border-border bg-muted/50 p-3 text-center text-xs text-muted-foreground hover:bg-muted"
                  >
                    {item.caption ?? "Reference link"}
                  </a>
                ),
              )}
            </div>
          </Card>
        )}

        {project.invoices.length > 0 && (
          <Card className="p-6">
            <h2 className="text-sm font-semibold">Payments</h2>
            <p className="mt-1 text-sm">
              <span className="font-medium text-success">{formatCurrency(paid, currency)}</span>{" "}
              received
              {invoiced > paid && (
                <>
                  {" · "}
                  <span className="font-medium text-warning">
                    {formatCurrency(invoiced - paid, currency)}
                  </span>{" "}
                  balance
                </>
              )}
            </p>

            <ul className="mt-3 divide-y divide-border">
              {project.invoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <a
                      href={`/i/${inv.shareToken}`}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {inv.number}
                    </a>
                    {inv.dueDate && (
                      <p className="text-xs text-muted-foreground">
                        Due {relativeDays(inv.dueDate)}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-medium tabular">
                    {formatCurrency(inv.total, currency)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </main>

      <footer className="border-t border-border py-6">
        <p className="text-center text-xs text-muted-foreground">
          {project.studio.name}
          {project.studio.phone ? ` · ${project.studio.phone}` : ""}
        </p>
      </footer>
    </div>
  );
}
