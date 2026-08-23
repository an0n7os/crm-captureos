import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Camera, CalendarDays, MapPin } from "lucide-react";

import { PortalRequests } from "@/components/public/portal-requests";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { DELIVERABLE_STATUS, EVENT_TYPE_LABEL, PROJECT_STATUS, meta } from "@/lib/status";
import { formatCurrency, formatDate, relativeDays, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Your projects", robots: { index: false } };

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const client = await prisma.client.findUnique({
    where: { portalToken: token },
    include: {
      studio: true,
      projects: {
        orderBy: { startDate: "desc" },
        include: {
          eventDays: { orderBy: { date: "asc" } },
          deliverables: { orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }] },
          invoices: {
            where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
            select: {
              id: true,
              number: true,
              total: true,
              amountPaid: true,
              dueDate: true,
              shareToken: true,
            },
          },
          // Only versions the studio has explicitly shared reach the client.
          postTasks: {
            include: {
              versions: { where: { isShared: true }, orderBy: { version: "desc" } },
            },
          },
        },
      },
      clientRequests: {
        orderBy: { createdAt: "desc" },
        include: {
          comments: { orderBy: { createdAt: "asc" } },
          project: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!client) notFound();

  const currency = client.studio.currency;
  const sharedVersions = client.projects.flatMap((p) =>
    p.postTasks.flatMap((t) =>
      t.versions.map((v) => ({
        id: v.id,
        taskTitle: t.title,
        projectName: p.name,
        version: v.version,
        url: v.url,
        note: v.note,
        createdAt: v.createdAt,
      })),
    ),
  );

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-4 py-5 sm:px-6">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Camera className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight">{client.studio.name}</p>
            <p className="text-xs text-muted-foreground">Client portal</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Hello {client.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything about your booking in one place.
          </p>
        </div>

        {client.projects.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nothing here yet. Your studio will add your project shortly.
            </p>
          </Card>
        ) : (
          client.projects.map((project) => {
            const m = meta(PROJECT_STATUS, project.status);
            const invoiced = project.invoices.reduce((s, i) => s + toNumber(i.total), 0);
            const paid = project.invoices.reduce((s, i) => s + toNumber(i.amountPaid), 0);
            const balance = invoiced - paid;

            return (
              <Card key={project.id} className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">{project.name}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {EVENT_TYPE_LABEL[project.eventType] ?? project.eventType}
                      {project.venue ? ` · ${project.venue}` : ""}
                    </p>
                  </div>
                  <Badge variant={m.variant}>{m.label}</Badge>
                </div>

                {project.eventDays.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Your event days
                    </p>
                    <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
                      {project.eventDays.map((day) => (
                        <li
                          key={day.id}
                          className="flex items-center gap-3 rounded-lg border border-border p-3"
                        >
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
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {project.deliverables.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      What you'll receive
                    </p>
                    <ul className="mt-2.5 divide-y divide-border">
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
                  </div>
                )}

                {project.invoices.length > 0 && (
                  <div className="mt-5 rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Payments
                        </p>
                        <p className="mt-1 text-sm">
                          <span className="font-medium text-success">
                            {formatCurrency(paid, currency)}
                          </span>{" "}
                          received
                          {balance > 0 && (
                            <>
                              {" · "}
                              <span className="font-medium text-warning">
                                {formatCurrency(balance, currency)}
                              </span>{" "}
                              balance
                            </>
                          )}
                        </p>
                      </div>
                    </div>

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
                  </div>
                )}
              </Card>
            );
          })
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
                      {v.projectName}
                      {v.note ? ` · ${v.note}` : ""} · {relativeDays(v.createdAt)}
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

        <PortalRequests
          token={token}
          projects={client.projects.map((p) => ({ id: p.id, name: p.name }))}
          requests={client.clientRequests.map((r) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
            projectName: r.project.name,
            comments: r.comments.map((c) => ({
              id: c.id,
              body: c.body,
              authorName: c.authorName,
              fromPortal: c.fromPortal,
              createdAt: c.createdAt.toISOString(),
            })),
          }))}
        />
      </main>

      <footer className="border-t border-border py-6">
        <p className="text-center text-xs text-muted-foreground">
          {client.studio.name}
          {client.studio.phone ? ` · ${client.studio.phone}` : ""}
        </p>
      </footer>
    </div>
  );
}
