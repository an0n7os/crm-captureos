"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, MessageSquare, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import {
  addRequestCommentAction,
  deleteRequestAction,
  saveRequestAction,
  updateRequestStatusAction,
} from "@/lib/actions/request-actions";
import { PRIORITY, REQUEST_STATUS, meta } from "@/lib/status";
import { cn, relativeDays } from "@/lib/utils";
import type { ActionState } from "@/lib/validators";

type Comment = {
  id: string;
  body: string;
  authorName: string | null;
  fromPortal: boolean;
  createdAt: string;
};

export type RequestItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  fromPortal: boolean;
  createdAt: string;
  project: { id: string; name: string };
  clientName: string | null;
  task: { id: string; title: string } | null;
  comments: Comment[];
};

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "NEW", label: "New" },
  { key: "PENDING", label: "Pending" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "all", label: "All" },
];

export function RequestList({
  requests,
  projects,
  tasks,
  counts,
  filters,
}: {
  requests: RequestItem[];
  projects: { id: string; name: string }[];
  tasks: { id: string; title: string; projectId: string }[];
  counts: Record<string, number>;
  filters: { status: string; projectId: string };
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<RequestItem | null>(null);

  function setFilter(key: "status" | "projectId", value: string) {
    const params = new URLSearchParams();
    const next = { ...filters, [key]: value };
    if (next.status && next.status !== "open") params.set("status", next.status);
    if (next.projectId) params.set("projectId", next.projectId);
    const qs = params.toString();
    router.push(qs ? `/requests?${qs}` : "/requests");
  }

  // Keep the open dialog in sync after a router refresh.
  React.useEffect(() => {
    if (!selected) return;
    const fresh = requests.find((r) => r.id === selected.id);
    if (fresh) setSelected(fresh);
  }, [requests]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter("status", f.key)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              filters.status === f.key
                ? "border-primary bg-primary-soft text-accent-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            {counts[f.key] !== undefined && (
              <span className="ml-1 tabular">{counts[f.key]}</span>
            )}
          </button>
        ))}

        <NativeSelect
          className="ml-auto h-9 w-56"
          value={filters.projectId}
          onChange={(e) => setFilter("projectId", e.target.value)}
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>

        <RequestDialog projects={projects} tasks={tasks}>
          <Button>
            <Plus />
            New request
          </Button>
        </RequestDialog>
      </div>

      {requests.length === 0 ? (
        <Card>
          <EmptyState
            icon={MessageSquare}
            title="No requests here"
            description="Revision requests raised by clients from the portal land in this queue."
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {requests.map((r) => {
            const m = meta(REQUEST_STATUS, r.status);
            const p = meta(PRIORITY, r.priority);

            return (
              <Card
                key={r.id}
                onClick={() => setSelected(r)}
                className="cursor-pointer p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {r.project.name}
                      {r.clientName ? ` · ${r.clientName}` : ""}
                      {r.task ? ` · ${r.task.title}` : ""}
                    </p>
                    {r.description && (
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                        {r.description}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {r.fromPortal && <Badge variant="info">From client</Badge>}
                    {r.priority !== "NORMAL" && <Badge variant={p.variant}>{p.label}</Badge>}
                    <Badge variant={m.variant}>{m.label}</Badge>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{relativeDays(r.createdAt)}</span>
                  {r.comments.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="size-3.5" />
                      {r.comments.length}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <RequestDetail request={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function RequestDetail({
  request,
  onClose,
}: {
  request: RequestItem | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [pending, start] = React.useTransition();

  React.useEffect(() => setBody(""), [request?.id]);

  if (!request) return null;

  const m = meta(REQUEST_STATUS, request.status);
  const p = meta(PRIORITY, request.priority);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{request.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            <Link href={`/projects/${request.project.id}`} className="hover:text-primary">
              {request.project.name}
            </Link>
            {request.clientName ? ` · ${request.clientName}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant={m.variant}>{m.label}</Badge>
            <Badge variant={p.variant}>{p.label}</Badge>
            {request.fromPortal && <Badge variant="info">From client</Badge>}
          </div>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {request.description && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{request.description}</p>
          )}

          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold">Thread</h3>
              <NativeSelect
                className="ml-auto h-8 w-36 text-xs"
                value={request.status}
                disabled={pending}
                onChange={(e) =>
                  start(async () => {
                    const result = await updateRequestStatusAction(request.id, e.target.value);
                    if (!result?.ok) {
                      toast.error(result?.error ?? "Could not update");
                      return;
                    }
                    toast.success("Status updated");
                    router.refresh();
                  })
                }
              >
                {Object.entries(REQUEST_STATUS).map(([value, option]) => (
                  <option key={value} value={value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            {request.comments.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No replies yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {request.comments.map((c) => (
                  <li
                    key={c.id}
                    className={cn(
                      "rounded-lg border border-border p-3",
                      c.fromPortal ? "bg-info-soft/50" : "bg-muted/40",
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {c.authorName ?? "Client"}
                      {c.fromPortal ? " (client)" : ""} · {relativeDays(c.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <Textarea
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Reply to the client…"
              />
              <Button
                className="self-end"
                disabled={pending || !body.trim()}
                onClick={() =>
                  start(async () => {
                    const result = await addRequestCommentAction(request.id, body);
                    if (result?.error) {
                      toast.error(result.error);
                      return;
                    }
                    setBody("");
                    toast.success("Reply added");
                    router.refresh();
                  })
                }
              >
                {pending ? <Loader2 className="animate-spin" /> : <Send />}
                Reply
              </Button>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="ghost"
            className="mr-auto text-danger hover:bg-danger-soft"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await deleteRequestAction(request.id);
                toast.success("Request deleted");
                onClose();
                router.refresh();
              })
            }
          >
            <Trash2 />
            Delete
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      Create request
    </Button>
  );
}

function RequestDialog({
  projects,
  tasks,
  children,
}: {
  projects: { id: string; name: string }[];
  tasks: { id: string; title: string; projectId: string }[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [projectId, setProjectId] = React.useState("");
  const [state, formAction] = useActionState<ActionState, FormData>(saveRequestAction, {});

  React.useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success("Request created");
      router.refresh();
    }
  }, [state, router]);

  const err = state.fieldErrors ?? {};
  const projectTasks = tasks.filter((t) => t.projectId === projectId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New request</DialogTitle>
        </DialogHeader>

        <form action={formAction}>
          <DialogBody className="grid gap-4">
            {state.error && (
              <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
                {state.error}
              </div>
            )}

            <Field label="Title" htmlFor="title" required error={err.title}>
              <Input
                id="title"
                name="title"
                placeholder="Swap the opening shot of the teaser"
                required
              />
            </Field>

            <Field label="Project" htmlFor="projectId" required error={err.projectId}>
              <NativeSelect
                id="projectId"
                name="projectId"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Related edit" htmlFor="taskId" error={err.taskId}>
              <NativeSelect id="taskId" name="taskId">
                <option value="">None</option>
                {projectTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Status" htmlFor="status" error={err.status}>
                <NativeSelect id="status" name="status" defaultValue="NEW">
                  {Object.entries(REQUEST_STATUS).map(([value, m]) => (
                    <option key={value} value={value}>
                      {m.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Priority" htmlFor="priority" error={err.priority}>
                <NativeSelect id="priority" name="priority" defaultValue="NORMAL">
                  {Object.entries(PRIORITY).map(([value, m]) => (
                    <option key={value} value={value}>
                      {m.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <Field label="Details" htmlFor="description" error={err.description}>
              <Textarea
                id="description"
                name="description"
                rows={4}
                placeholder="What exactly does the client want changed?"
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SaveButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
