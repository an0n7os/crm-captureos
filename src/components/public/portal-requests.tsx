"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, Plus, Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { addPortalCommentAction, createPortalRequestAction } from "@/lib/actions/public-actions";
import { REQUEST_STATUS, meta } from "@/lib/status";
import { cn, relativeDays } from "@/lib/utils";

type PortalComment = {
  id: string;
  body: string;
  authorName: string | null;
  fromPortal: boolean;
  createdAt: string;
};

type PortalRequest = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  projectName: string;
  comments: PortalComment[];
};

/** Lets the client raise revision requests and follow the thread. */
export function PortalRequests({
  token,
  projects,
  requests,
}: {
  token: string;
  projects: { id: string; name: string }[];
  requests: PortalRequest[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [projectId, setProjectId] = React.useState(projects[0]?.id ?? "");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [pending, start] = React.useTransition();

  function submit() {
    if (!projectId) {
      toast.error("Choose which project this is about");
      return;
    }
    start(async () => {
      const result = await createPortalRequestAction(token, projectId, title, description);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Sent to the studio");
      setTitle("");
      setDescription("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Your requests</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ask for a change and follow the studio's replies here.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen((v) => !v)} disabled={projects.length === 0}>
          <Plus />
          New request
        </Button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 rounded-lg border border-border p-4">
          {projects.length > 1 && (
            <Field label="Project" htmlFor="p-project">
              <NativeSelect
                id="p-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}

          <Field label="What would you like changed?" htmlFor="p-title">
            <Input
              id="p-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Use the temple entrance shot as the opener"
            />
          </Field>

          <Field label="Any details" htmlFor="p-desc">
            <Textarea
              id="p-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Timestamps, names, anything that helps the editor."
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !title.trim()}>
              {pending ? <Loader2 className="animate-spin" /> : <Send />}
              Send request
            </Button>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="size-4" />
          No requests yet.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {requests.map((r) => (
            <RequestThread key={r.id} token={token} request={r} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function RequestThread({ token, request }: { token: string; request: PortalRequest }) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [expanded, setExpanded] = React.useState(false);
  const [pending, start] = React.useTransition();

  const m = meta(REQUEST_STATUS, request.status);

  return (
    <li className="rounded-lg border border-border p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{request.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {request.projectName} · {relativeDays(request.createdAt)}
            {request.comments.length > 0 ? ` · ${request.comments.length} replies` : ""}
          </p>
        </div>
        <Badge variant={m.variant}>{m.label}</Badge>
      </button>

      {expanded && (
        <div className="mt-3 border-t border-border pt-3">
          {request.description && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {request.description}
            </p>
          )}

          {request.comments.length > 0 && (
            <ul className="mt-3 space-y-2">
              {request.comments.map((c) => (
                <li
                  key={c.id}
                  className={cn(
                    "rounded-lg p-3",
                    c.fromPortal ? "bg-secondary" : "bg-primary-soft",
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.fromPortal ? "You" : (c.authorName ?? "Studio")} ·{" "}
                    {relativeDays(c.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-col gap-2">
            <Textarea
              rows={2}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a reply…"
            />
            <Button
              size="sm"
              className="self-end"
              disabled={pending || !body.trim()}
              onClick={() =>
                start(async () => {
                  const result = await addPortalCommentAction(token, request.id, body);
                  if (result?.error) {
                    toast.error(result.error);
                    return;
                  }
                  setBody("");
                  toast.success("Reply sent");
                  router.refresh();
                })
              }
            >
              {pending ? <Loader2 className="animate-spin" /> : <Send />}
              Reply
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
