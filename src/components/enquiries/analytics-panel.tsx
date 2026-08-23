import Link from "next/link";
import { BarChart3, ExternalLink } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TableWrap, TR } from "@/components/ui/table";
import { SOURCE_LABEL } from "@/lib/status";
import { formatCurrency } from "@/lib/utils";

export type AnalyticsData = {
  views: number;
  submissions: number;
  totalEnquiries: number;
  won: number;
  pipelineValue: number;
  wonValue: number;
  bySource: { source: string; total: number; won: number; value: number }[];
  byMonth: { label: string; leads: number; won: number }[];
  topReferrers: { referrer: string; count: number }[];
};

export function AnalyticsPanel({
  data,
  currency,
}: {
  data: AnalyticsData;
  currency: string;
}) {
  const conversion =
    data.views > 0 ? Math.round((data.submissions / data.views) * 100) : 0;
  const winRate =
    data.totalEnquiries > 0 ? Math.round((data.won / data.totalEnquiries) * 100) : 0;

  const maxMonth = Math.max(1, ...data.byMonth.map((m) => m.leads));

  if (data.totalEnquiries === 0 && data.views === 0) {
    return (
      <Card>
        <EmptyState
          icon={BarChart3}
          title="No data yet"
          description="Once your enquiry link gets visits and leads start coming in, the numbers land here."
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Page views", value: String(data.views) },
          { label: "Form submissions", value: String(data.submissions) },
          { label: "Page conversion", value: `${conversion}%` },
          { label: "Enquiry win rate", value: `${winRate}%` },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-1.5 text-2xl font-semibold tabular">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Open pipeline value
          </p>
          <p className="mt-1.5 text-2xl font-semibold tabular text-warning">
            {formatCurrency(data.pipelineValue, currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Budget on enquiries that are still live.
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Won value
          </p>
          <p className="mt-1.5 text-2xl font-semibold tabular text-success">
            {formatCurrency(data.wonValue, currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Budget on enquiries you converted.
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">Leads per month</h2>
        <ul className="mt-5 space-y-2.5">
          {data.byMonth.map((m) => (
            <li key={m.label} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-xs text-muted-foreground">{m.label}</span>
              <div className="flex h-5 flex-1 items-center gap-1">
                <div
                  className="h-full rounded-sm bg-primary/25"
                  style={{ width: `${(m.leads / maxMonth) * 100}%` }}
                />
                <div
                  className="-ml-1 h-full rounded-sm bg-success"
                  style={{ width: `${(m.won / maxMonth) * 100}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-xs tabular text-muted-foreground">
                {m.leads} · {m.won} won
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="p-5 pb-0">
            <h2 className="text-sm font-semibold">By source</h2>
          </div>

          <TableWrap className="mt-4">
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Source</TH>
                  <TH className="text-right">Leads</TH>
                  <TH className="text-right">Won</TH>
                  <TH className="text-right">Value</TH>
                </TR>
              </THead>
              <TBody>
                {data.bySource.map((row) => (
                  <TR key={row.source}>
                    <TD className="text-sm">{SOURCE_LABEL[row.source] ?? row.source}</TD>
                    <TD className="text-right text-sm tabular">{row.total}</TD>
                    <TD className="text-right text-sm tabular text-success">{row.won}</TD>
                    <TD className="text-right text-sm tabular">
                      {formatCurrency(row.value, currency)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold">Where visits come from</h2>

          {data.topReferrers.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No referrer data yet — most visits open the link directly.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {data.topReferrers.map((r) => (
                <li key={r.referrer} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-sm">
                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{r.referrer}</span>
                  </span>
                  <span className="shrink-0 text-sm tabular text-muted-foreground">{r.count}</span>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/reports"
            className="mt-4 inline-block text-xs font-medium text-primary hover:opacity-75"
          >
            Full studio reports
          </Link>
        </Card>
      </div>
    </div>
  );
}
