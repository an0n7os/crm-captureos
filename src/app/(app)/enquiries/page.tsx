import Link from "next/link";
import type { Metadata } from "next";
import { Inbox, LayoutGrid, List, Plus } from "lucide-react";

import { AnalyticsPanel } from "@/components/enquiries/analytics-panel";
import { EnquiryBoard } from "@/components/enquiries/enquiry-board";
import { LandingPagePanel } from "@/components/enquiries/landing-page-panel";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TableWrap, TR } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  ENQUIRY_PIPELINE,
  ENQUIRY_STATUS,
  EVENT_TYPE_LABEL,
  SOURCE_LABEL,
  meta,
} from "@/lib/status";
import { cn, formatCurrency, formatDate, relativeDays, slugify, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Leads" };

// Two views: the pipeline you work every day, and the public page that feeds it.
// Importing and exporting lives under Settings, alongside the rest of the data tools.
const SECTIONS = [
  { key: "enquiries", label: "Leads" },
  { key: "landing", label: "Enquiry page" },
] as const;

type Section = (typeof SECTIONS)[number]["key"];

type SearchParams = Promise<{
  section?: string;
  view?: string;
  status?: string;
  q?: string;
  source?: string;
}>;

export default async function EnquiriesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const section: Section = SECTIONS.some((s) => s.key === sp.section)
    ? (sp.section as Section)
    : "enquiries";
  const view = sp.view === "board" ? "board" : "list";
  const currency = user.studio.currency;
  const studioId = user.studioId;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Leads"
        description="Every enquiry from first message to signed booking."
        actions={
          section === "enquiries" ? (
            <Button asChild>
              <Link href="/enquiries/new">
                <Plus />
                New enquiry
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="scrollbar-slim -mb-px overflow-x-auto border-b border-border">
        <nav className="flex min-w-max gap-1">
          {SECTIONS.map((s) => (
            <Link
              key={s.key}
              href={s.key === "enquiries" ? "/enquiries" : `/enquiries?section=${s.key}`}
              className={cn(
                "border-b-2 px-3.5 py-3 text-sm font-medium transition-colors",
                section === s.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </div>

      {section === "enquiries" && (
        <EnquiryListSection sp={sp} view={view} studioId={studioId} currency={currency} />
      )}

      {section === "landing" && (
        <>
          <AnalyticsSection studioId={studioId} currency={currency} />
          <LandingPagePanel
            studioName={user.studio.name}
            values={{
              slug: user.studio.enquirySlug ?? slugify(user.studio.name),
              enabled: user.studio.enquiryEnabled,
              coverUrl: user.studio.enquiryCoverUrl,
              heading: user.studio.enquiryHeading ?? "",
              subtext: user.studio.enquirySubtext ?? "",
            }}
          />
        </>
      )}
    </div>
  );
}

async function AnalyticsSection({
  studioId,
  currency,
}: {
  studioId: string;
  currency: string;
}) {
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [views, enquiries, referrerRows] = await Promise.all([
    prisma.leadPageView.findMany({
      where: { studioId },
      select: { submitted: true, referrer: true },
    }),
    prisma.enquiry.findMany({
      where: { studioId },
      select: { source: true, status: true, budgetMax: true, createdAt: true },
    }),
    prisma.leadPageView.groupBy({
      by: ["referrer"],
      where: { studioId, referrer: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { referrer: "desc" } },
      take: 6,
    }),
  ]);

  const sourceMap = new Map<string, { total: number; won: number; value: number }>();
  for (const e of enquiries) {
    const row = sourceMap.get(e.source) ?? { total: 0, won: 0, value: 0 };
    row.total += 1;
    if (e.status === "WON") {
      row.won += 1;
      row.value += toNumber(e.budgetMax);
    }
    sourceMap.set(e.source, row);
  }

  const byMonth: { label: string; leads: number; won: number }[] = [];
  const indexOf = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    indexOf.set(`${d.getFullYear()}-${d.getMonth()}`, byMonth.length);
    byMonth.push({
      label: d.toLocaleString("en-IN", { month: "short" }),
      leads: 0,
      won: 0,
    });
  }
  for (const e of enquiries) {
    if (e.createdAt < since) continue;
    const slot = indexOf.get(`${e.createdAt.getFullYear()}-${e.createdAt.getMonth()}`);
    if (slot === undefined) continue;
    byMonth[slot].leads += 1;
    if (e.status === "WON") byMonth[slot].won += 1;
  }

  const open = enquiries.filter((e) => !["WON", "LOST"].includes(e.status));

  return (
    <AnalyticsPanel
      currency={currency}
      data={{
        views: views.length,
        submissions: views.filter((v) => v.submitted).length,
        totalEnquiries: enquiries.length,
        won: enquiries.filter((e) => e.status === "WON").length,
        pipelineValue: open.reduce((s, e) => s + toNumber(e.budgetMax), 0),
        wonValue: enquiries
          .filter((e) => e.status === "WON")
          .reduce((s, e) => s + toNumber(e.budgetMax), 0),
        bySource: [...sourceMap.entries()]
          .map(([source, stat]) => ({ source, ...stat }))
          .sort((a, b) => b.total - a.total),
        byMonth,
        topReferrers: referrerRows.map((r) => ({
          referrer: r.referrer ?? "Direct",
          count: r._count._all,
        })),
      }}
    />
  );
}

async function EnquiryListSection({
  sp,
  view,
  studioId,
  currency,
}: {
  sp: { status?: string; q?: string; source?: string };
  view: "list" | "board";
  studioId: string;
  currency: string;
}) {
  const where = {
    studioId,
    ...(sp.status && sp.status !== "all" ? { status: sp.status as never } : {}),
    ...(sp.source && sp.source !== "all" ? { source: sp.source as never } : {}),
    ...(sp.q
      ? {
          OR: [
            { contactName: { contains: sp.q, mode: "insensitive" as const } },
            { partnerName: { contains: sp.q, mode: "insensitive" as const } },
            { phone: { contains: sp.q } },
            { email: { contains: sp.q, mode: "insensitive" as const } },
            { venue: { contains: sp.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [enquiries, statusCounts] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      orderBy: [{ nextFollowUpAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: 200,
      include: { owner: { select: { id: true, name: true } } },
    }),
    prisma.enquiry.groupBy({
      by: ["status"],
      where: { studioId },
      _count: { _all: true },
    }),
  ]);

  const counts = Object.fromEntries(statusCounts.map((r) => [r.status, r._count._all]));
  const total = Object.values(counts).reduce((a: number, b) => a + (b as number), 0);

  const qs = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { view, status: sp.status, source: sp.source, q: sp.q, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && v !== "all") params.set(k, v);
    const s = params.toString();
    return s ? `/enquiries?${s}` : "/enquiries";
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={qs({ status: undefined })}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            !sp.status || sp.status === "all"
              ? "border-primary bg-primary-soft text-accent-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          All <span className="ml-1 tabular">{total}</span>
        </Link>

        {ENQUIRY_PIPELINE.map((status) => {
          const m = ENQUIRY_STATUS[status];
          return (
            <Link
              key={status}
              href={qs({ status })}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                sp.status === status
                  ? "border-primary bg-primary-soft text-accent-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label} <span className="ml-1 tabular">{counts[status] ?? 0}</span>
            </Link>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            <Link
              href={qs({ view: "list" })}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                view === "list"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="size-3.5" />
              List
            </Link>
            <Link
              href={qs({ view: "board" })}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                view === "board"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="size-3.5" />
              Board
            </Link>
          </div>

          <form action="/enquiries">
            {view === "board" && <input type="hidden" name="view" value="board" />}
            {sp.status && <input type="hidden" name="status" value={sp.status} />}
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search name, phone, venue…"
              className="h-9 w-56 rounded-lg border border-input bg-card px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
            />
          </form>
        </div>
      </div>

      {enquiries.length === 0 ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title={sp.q || sp.status ? "No enquiries match this filter" : "No enquiries yet"}
            description={
              sp.q || sp.status
                ? "Try clearing the filters or searching for something else."
                : "Add a lead by hand, or share your landing page link and let them come in."
            }
            action={
              <Button asChild>
                <Link href="/enquiries/new">
                  <Plus />
                  New enquiry
                </Link>
              </Button>
            }
          />
        </Card>
      ) : view === "board" ? (
        <EnquiryBoard
          currency={currency}
          enquiries={enquiries.map((e) => ({
            id: e.id,
            contactName: e.contactName,
            partnerName: e.partnerName,
            status: e.status,
            eventType: e.eventType,
            eventDate: e.eventDate?.toISOString() ?? null,
            venue: e.venue,
            budgetMax: e.budgetMax ? Number(e.budgetMax) : null,
            nextFollowUpAt: e.nextFollowUpAt?.toISOString() ?? null,
            ownerName: e.owner?.name ?? null,
          }))}
        />
      ) : (
        <Card>
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Client</TH>
                  <TH>Event</TH>
                  <TH>Date</TH>
                  <TH>Budget</TH>
                  <TH>Source</TH>
                  <TH>Follow-up</TH>
                  <TH>Owner</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {enquiries.map((e) => {
                  const m = meta(ENQUIRY_STATUS, e.status);
                  const overdue = e.nextFollowUpAt && new Date(e.nextFollowUpAt) < new Date();

                  return (
                    <TR key={e.id}>
                      <TD>
                        <Link href={`/enquiries/${e.id}`} className="group flex items-center gap-3">
                          <Avatar name={e.contactName} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium group-hover:text-primary">
                              {e.contactName}
                              {e.partnerName ? ` & ${e.partnerName}` : ""}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {e.phone ?? e.email ?? e.city ?? "—"}
                            </span>
                          </span>
                        </Link>
                      </TD>
                      <TD>
                        <span className="text-sm">
                          {EVENT_TYPE_LABEL[e.eventType] ?? e.eventType}
                        </span>
                        {e.venue && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {e.venue}
                          </span>
                        )}
                      </TD>
                      <TD className="whitespace-nowrap text-sm">{formatDate(e.eventDate)}</TD>
                      <TD className="whitespace-nowrap text-sm tabular">
                        {e.budgetMax
                          ? formatCurrency(e.budgetMax, currency)
                          : e.budgetMin
                            ? formatCurrency(e.budgetMin, currency)
                            : "—"}
                      </TD>
                      <TD>
                        <span className="text-xs text-muted-foreground">
                          {SOURCE_LABEL[e.source] ?? e.source}
                        </span>
                      </TD>
                      <TD className="whitespace-nowrap">
                        {e.nextFollowUpAt ? (
                          <span
                            className={cn(
                              "text-xs font-medium",
                              overdue ? "text-danger" : "text-muted-foreground",
                            )}
                          >
                            {relativeDays(e.nextFollowUpAt)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TD>
                      <TD>
                        {e.owner ? (
                          <Avatar name={e.owner.name} size="sm" />
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
    </>
  );
}
