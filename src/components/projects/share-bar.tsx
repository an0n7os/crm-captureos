"use client";

import * as React from "react";
import { Check, Copy, ExternalLink, Link2, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QrCodeButton } from "@/components/ui/qr-code";
import { updateProjectPinAction } from "@/lib/actions/contract-actions";

/** Client-facing project link with an optional 4-digit PIN gate. */
export function ShareBar({
  projectId,
  shareToken,
  pin,
}: {
  projectId: string;
  shareToken: string;
  pin: string | null;
}) {
  const [copied, setCopied] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(pin ?? "");
  const [saved, setSaved] = React.useState(pin ?? "");
  const [pending, start] = React.useTransition();

  // Built on the client so it picks up whatever host the app is served from.
  const [url, setUrl] = React.useState(`/p/${shareToken}`);
  React.useEffect(() => setUrl(`${window.location.origin}/p/${shareToken}`), [shareToken]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select the link and copy it manually");
    }
  }

  function savePin() {
    start(async () => {
      const result = await updateProjectPinAction(projectId, draft);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setSaved(draft.replace(/\D/g, ""));
      setEditing(false);
      toast.success(draft ? "PIN updated" : "PIN removed");
    });
  }

  return (
    <Card className="flex flex-wrap items-center gap-3 p-3">
      <span className="inline-flex items-center gap-2 pl-1 text-sm font-medium">
        <Link2 className="size-4 text-muted-foreground" />
        Share with your client
      </span>

      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground outline-none"
      />

      <Button variant="outline" size="sm" onClick={copy}>
        {copied ? <Check className="text-success" /> : <Copy />}
        Copy
      </Button>

      <Button variant="outline" size="sm" asChild>
        <a href={url} target="_blank" rel="noreferrer">
          <ExternalLink />
          Open
        </a>
      </Button>

      <QrCodeButton url={url} label="QR" filename="project-link" />

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          PIN
        </span>

        {editing ? (
          <>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
              inputMode="numeric"
              className="h-9 w-20 text-center tracking-[0.3em]"
            />
            <Button size="sm" onClick={savePin} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(saved);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm tracking-[0.25em] transition-colors hover:bg-secondary"
          >
            {saved || "—— none ——"}
            <Pencil className="size-3 text-muted-foreground" />
          </button>
        )}
      </div>
    </Card>
  );
}
