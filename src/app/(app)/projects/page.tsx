import Link from "next/link";
import type { Metadata } from "next";
import { FolderKanban, Plus } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TableWrap, TR } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { EVENT_TYPE_LABEL, PROJECT_STATUS, meta } from "@/lib/status";
import { cn, formatCurrency, formatDate, relativeDays, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Projects" };

const FILTERS = [
  { key: "active", label: "Active" },
  { key: "UPCOMING", label: "Upcoming" },
  { key: "POST_PRODUCTION", label: "Post production" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "COMPLETED", label: "Completed" },
  { key: "all", label: "All" },
];

type SearchParams = Promise<{ status?: string; q?: string }>;

export default async function ProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const status = sp.status ?? "active";
  const currency = user.studio.currency;

  const statusWhere =
    status === "all"
      ? {}
      : status === "active"
        ? { status: { notIn: ["COMPLETED", "CANCELLED"] as never } }
        : { status: status as never };

  const projects = await prisma.project.findMany({
    where: {
      studioId: user.studioId,
      ...statusWhere,
      ...(sp.q
        ? {
            OR: [
              { name: { contains: sp.q, mode: "insensitive" as const } },
              { code: { contains: sp.q, mode: "insensitive" as const } },
              { venue: { contains: sp.q, mode: "insensitive" as const } },
              { client: { name: { contains: sp.q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    orderBy: [{ startDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 200,
    include: {
      client: { select: { id: true, name: true } },
      manager: { select: { name: true } },
      _count: { select: { deliverables: true, eventDays: true } },
      deliverables: { where: { status: "DELIVERED" }, select: { id: true } },
      invoices: { select: { total: true, amountPaid: true, status: true } },
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Projects"
        description="Every booked event, its deliverables and its money."
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Plus />
              New project
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "active" ? "/projects" : `/projects?status=${f.key}`}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              status === f.key
                ? "border-primary bg-primary-soft text-accent-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </Link>
        ))}

        <form action="/projects" className="ml-auto">
          {status !== "active" && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search project, client, venue…"
            className="h-9 w-56 rounded-lg border border-input bg-card px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
          />
        </form>
      </div>

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title={sp.q ? "No projects match this search" : "No projects yet"}
            description="Convert a won enquiry, or create a project directly."
            action={
              <Button asChild>
                <Link href="/projects/new">
                  <Plus />
                  New project
                </Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Project</TH>
                  <TH>Type</TH>
                  <TH>Event date</TH>
                  <TH>Deliverables</TH>
                  <TH>Value</TH>
                  <TH>Received</TH>
                  <TH>Manager</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {projects.map((p) => {
                  const m = meta(PROJECT_STATUS, p.status);
                  const delivered = p.deliverables.length;
                  const totalDeliverables = p._count.deliverables;
                  const received = p.invoices.reduce((s, i) => s + toNumber(i.amountPaid), 0);
                  const invoiced = p.invoices
                    .filter((i) => i.status !== "DRAFT" && i.status !== "CANCELLED")
                    .reduce((s, i) => s + toNumber(i.total), 0);

                  return (
                    <TR key={p.id}>
                      <TD>
                        <Link href={`/projects/${p.id}`} className="group block min-w-0">
                          <span className="block truncate text-sm font-medium group-hover:text-primary">
                            {p.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {p.code} · {p.client.name}
                          </span>
                        </Link>
                      </TD>
                      <TD className="text-sm">{EVENT_TYPE_LABEL[p.eventType] ?? p.eventType}</TD>
                      <TD className="whitespace-nowrap">
                        <span className="text-sm">{formatDate(p.startDate)}</span>
                        {p.startDate && (
                          <span className="block text-xs text-muted-foreground">
                            {relativeDays(p.startDate)}
                          </span>
                        )}
                      </TD>
                      <TD>
                        {totalDeliverables === 0 ? (
                          <span className="text-xs text-muted-foreground">None</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full bg-success transition-all"
                                style={{ width: `${(delivered / totalDeliverables) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground tabular">
                              {delivered}/{totalDeliverables}
                            </span>
                          </div>
                        )}
                      </TD>
                      <TD className="whitespace-nowrap text-sm tabular">
                        {formatCurrency(p.packageValue, currency)}
                      </TD>
                      <TD className="whitespace-nowrap text-sm tabular">
                        <span className={received > 0 ? "text-success" : "text-muted-foreground"}>
                          {formatCurrency(received, currency)}
                        </span>
                        {invoiced > received && (
                          <span className="block text-xs text-warning">
                            {formatCurrency(invoiced - received, currency)} due
                          </span>
                        )}
                      </TD>
                      <TD>
                        {p.manager ? (
                          <Avatar name={p.manager.name} size="sm" />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TD>
                      <TD>
                        <Badge variant={m.variant}>{m.label}</Badge>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      )}
    </div>
  );
}
