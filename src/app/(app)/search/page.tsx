import Link from "next/link";
import type { Metadata } from "next";
import { FolderKanban, Inbox, Receipt, Search as SearchIcon, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ENQUIRY_STATUS, INVOICE_STATUS, PROJECT_STATUS, meta } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Search" };

type SearchParams = Promise<{ q?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const studioId = user.studioId;
  const currency = user.studio.currency;

  if (!q) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Search" description="Find clients, projects, enquiries and invoices." />
        <Card>
          <EmptyState
            icon={SearchIcon}
            title="Type something to search"
            description="Use the search box at the top of the page."
          />
        </Card>
      </div>
    );
  }

  const like = { contains: q, mode: "insensitive" as const };

  const [clients, projects, enquiries, invoices] = await Promise.all([
    prisma.client.findMany({
      where: {
        studioId,
        OR: [{ name: like }, { partnerName: like }, { phone: { contains: q } }, { email: like }],
      },
      take: 10,
      select: { id: true, name: true, partnerName: true, phone: true, city: true },
    }),
    prisma.project.findMany({
      where: { studioId, OR: [{ name: like }, { code: like }, { venue: like }] },
      take: 10,
      select: { id: true, name: true, code: true, status: true, startDate: true },
    }),
    prisma.enquiry.findMany({
      where: {
        studioId,
        OR: [{ contactName: like }, { partnerName: like }, { phone: { contains: q } }, { venue: like }],
      },
      take: 10,
      select: { id: true, contactName: true, partnerName: true, status: true, eventDate: true },
    }),
    prisma.invoice.findMany({
      where: { studioId, OR: [{ number: like }, { title: like }, { client: { name: like } }] },
      take: 10,
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        total: true,
        client: { select: { name: true } },
      },
    }),
  ]);

  const total = clients.length + projects.length + enquiries.length + invoices.length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Results for "${q}"`}
        description={`${total} ${total === 1 ? "match" : "matches"} across your studio.`}
      />

      {total === 0 ? (
        <Card>
          <EmptyState
            icon={SearchIcon}
            title="Nothing matched"
            description="Try a name, phone number, venue or invoice number."
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {projects.length > 0 && (
            <ResultCard title="Projects" icon={FolderKanban}>
              {projects.map((p) => {
                const m = meta(PROJECT_STATUS, p.status);
                return (
                  <ResultRow
                    key={p.id}
                    href={`/projects/${p.id}`}
                    title={p.name}
                    subtitle={`${p.code} · ${formatDate(p.startDate)}`}
                    badge={<Badge variant={m.variant}>{m.label}</Badge>}
                  />
                );
              })}
            </ResultCard>
          )}

          {enquiries.length > 0 && (
            <ResultCard title="Enquiries" icon={Inbox}>
              {enquiries.map((e) => {
                const m = meta(ENQUIRY_STATUS, e.status);
                return (
                  <ResultRow
                    key={e.id}
                    href={`/enquiries/${e.id}`}
                    title={
                      e.partnerName ? `${e.contactName} & ${e.partnerName}` : e.contactName
                    }
                    subtitle={formatDate(e.eventDate)}
                    badge={<Badge variant={m.variant}>{m.label}</Badge>}
                  />
                );
              })}
            </ResultCard>
          )}

          {clients.length > 0 && (
            <ResultCard title="Clients" icon={Users}>
              {clients.map((c) => (
                <ResultRow
                  key={c.id}
                  href={`/projects?q=${encodeURIComponent(c.name)}`}
                  title={c.partnerName ? `${c.name} & ${c.partnerName}` : c.name}
                  subtitle={[c.phone, c.city].filter(Boolean).join(" · ") || "—"}
                />
              ))}
            </ResultCard>
          )}

          {invoices.length > 0 && (
            <ResultCard title="Invoices" icon={Receipt}>
              {invoices.map((inv) => {
                const m = meta(INVOICE_STATUS, inv.status);
                return (
                  <ResultRow
                    key={inv.id}
                    href={`/finances/invoices/${inv.id}`}
                    title={inv.number}
                    subtitle={`${inv.client.name} · ${formatCurrency(inv.total, currency)}`}
                    badge={<Badge variant={m.variant}>{m.label}</Badge>}
                  />
                );
              })}
            </ResultCard>
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2.5">
        <Icon className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <ul className="mt-3 divide-y divide-border">{children}</ul>
    </Card>
  );
}

function ResultRow({
  href,
  title,
  subtitle,
  badge,
}: {
  href: string;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 py-2.5 hover:text-primary">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {badge}
      </Link>
    </li>
  );
}
