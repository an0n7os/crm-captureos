"use client";

import * as React from "react";
import { Download, FileSpreadsheet, Loader2, Table2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { importEnquiriesAction } from "@/lib/actions/import-actions";

/**
 * CSV in, CSV out. A hosted Sheets sync needs OAuth credentials from the
 * studio's own Google Cloud project, so that stays a manual step for now.
 */
export function IntegrationsPanel({ enquiryCount }: { enquiryCount: number }) {
  const [csv, setCsv] = React.useState("");
  const [pending, start] = React.useTransition();
  const fileRef = React.useRef<HTMLInputElement>(null);

  function importCsv() {
    start(async () => {
      const result = await importEnquiriesAction(csv);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Import finished");
      setCsv("");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success-soft">
            <Table2 className="size-4.5 text-success" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Import enquiries from a spreadsheet</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Export your sheet as CSV, then paste it or pick the file. Nothing leaves your server.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-border p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Expected columns
          </p>
          <code className="mt-2 block overflow-x-auto whitespace-nowrap rounded-md bg-muted px-3 py-2 text-xs">
            name, phone, email, city, event date, venue, guests, budget, source, notes
          </code>
          <p className="mt-2 text-xs text-muted-foreground">
            Only <strong>name</strong> is required. A header row is expected and skipped. Extra
            columns are ignored.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Textarea
            rows={8}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={"name,phone,email,city,event date,venue,guests,budget,source,notes\nArjun Menon,+91 98470 12345,arjun@example.com,Kochi,2027-01-15,Le Meridien,500,150000,INSTAGRAM,Wants candid coverage"}
            className="font-mono text-xs"
          />

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setCsv(await file.text());
                e.target.value = "";
                toast.success("File loaded — review it, then import");
              }}
            />

            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload />
              Choose CSV file
            </Button>

            <Button onClick={importCsv} disabled={pending || !csv.trim()}>
              {pending ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
              Import enquiries
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
            <Download className="size-4.5 text-accent-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Export your data</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Download everything as CSV — useful for backups or your accountant.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["Enquiries", "enquiries", enquiryCount],
            ["Projects", "projects", null],
            ["Invoices", "invoices", null],
            ["Expenses", "expenses", null],
            ["Clients", "clients", null],
          ].map(([label, kind, count]) => (
            <Button key={kind as string} variant="outline" size="sm" asChild>
              <a href={`/api/export?type=${kind}`} download>
                <Download />
                {label as string}
                {typeof count === "number" ? ` (${count})` : ""}
              </a>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
