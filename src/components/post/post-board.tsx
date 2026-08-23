"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  CalendarClock,
  ExternalLink,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
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
import {
  addTaskVersionAction,
  deletePostTaskAction,
  movePostTaskAction,
  savePostTaskAction,
  shareVersionAction,
} from "@/lib/actions/post-actions";
import { POST_BOARD, POST_STATUS, PRIORITY, meta } from "@/lib/status";
import { cn, formatDate, relativeDays } from "@/lib/utils";
import type { ActionState } from "@/lib/validators";

type Version = {
  id: string;
  version: number;
  url: string | null;
  note: string | null;
  isShared: boolean;
  uploadedBy: string | null;
  createdAt: string;
};

export type BoardTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  project: { id: string; name: string; code: string };
  assignee: { id: string; name: string } | null;
  deliverable: { id: string; name: string } | null;
  requestCount: number;
  versions: Version[];
};

type Option = { id: string; name: string };

export function PostBoard({
  tasks,
  projects,
  editors,
  deliverables,
  filters,
}: {
  tasks: BoardTask[];
  projects: { id: string; name: string; code: string }[];
  editors: Option[];
  deliverables: { id: string; name: string; projectId: string }[];
  filters: { projectId: string; assigneeId: string };
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(tasks);
  const [dragOver, setDragOver] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<BoardTask | null>(null);
  const [pending, start] = React.useTransition();

  React.useEffect(() => setItems(tasks), [tasks]);

  function move(status: string, id: string) {
    setDragOver(null);
    const task = items.find((t) => t.id === id);
    if (!task || task.status === status) return;

    const previous = items;
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));

    start(async () => {
      const result = await movePostTaskAction(id, status);
      if (!result?.ok) {
        setItems(previous);
        toast.error(result?.error ?? "Could not move the task");
        return;
      }
      router.refresh();
    });
  }

  function applyFilter(key: "projectId" | "assigneeId", value: string) {
    const params = new URLSearchParams(filters as unknown as Record<string, string>);
    if (value) params.set(key, value);
    else params.delete(key);
    for (const [k, v] of [...params.entries()]) if (!v) params.delete(k);
    const qs = params.toString();
    router.push(qs ? `/post-production?${qs}` : "/post-production");
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect
          className="h-9 w-56"
          value={filters.projectId}
          onChange={(e) => applyFilter("projectId", e.target.value)}
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          className="h-9 w-44"
          value={filters.assigneeId}
          onChange={(e) => applyFilter("assigneeId", e.target.value)}
        >
          <option value="">All editors</option>
          {editors.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </NativeSelect>

        <TaskDialog projects={projects} editors={editors} deliverables={deliverables}>
          <Button className="ml-auto">
            <Plus />
            New task
          </Button>
        </TaskDialog>
      </div>

      <div className={cn("scrollbar-slim -mx-1 overflow-x-auto pb-2", pending && "opacity-90")}>
        <div className="flex min-w-max gap-3 px-1">
          {POST_BOARD.map((status) => {
            const column = items.filter((t) => t.status === status);
            const m = POST_STATUS[status];

            return (
              <div
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(status);
                }}
                onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  move(status, e.dataTransfer.getData("text/plain"));
                }}
                className={cn(
                  "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-muted/40 transition-colors",
                  dragOver === status && "border-primary bg-primary-soft/60",
                )}
              >
                <div className="flex items-center gap-2 px-3 py-3">
                  <span className="text-sm font-medium">{m.label}</span>
                  <span className="rounded-md bg-card px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular">
                    {column.length}
                  </span>
                </div>

                <div className="scrollbar-slim flex max-h-[65vh] flex-col gap-2 overflow-y-auto px-2 pb-2">
                  {column.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">Drop here</p>
                  ) : (
                    column.map((task) => {
                      const p = meta(PRIORITY, task.priority);
                      const overdue =
                        task.dueDate &&
                        !["APPROVED", "DELIVERED"].includes(task.status) &&
                        new Date(task.dueDate) < new Date();

                      return (
                        <article
                          key={task.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
                          onClick={() => setSelected(task)}
                          className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-[0_1px_2px_rgba(16,18,32,0.04)] transition-shadow hover:shadow-md"
                        >
                          <p className="text-sm font-medium leading-snug">{task.title}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {task.project.name}
                            {task.deliverable ? ` · ${task.deliverable.name}` : ""}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            {task.priority !== "NORMAL" && (
                              <Badge variant={p.variant}>{p.label}</Badge>
                            )}
                            {task.versions.length > 0 && (
                              <Badge variant="outline">v{task.versions[0].version}</Badge>
                            )}
                            {task.requestCount > 0 && (
                              <Badge variant="warning">
                                <MessageSquare className="size-3" />
                                {task.requestCount}
                              </Badge>
                            )}
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            {task.assignee ? (
                              <Avatar name={task.assignee.name} size="sm" />
                            ) : (
                              <span className="text-xs text-muted-foreground">Unassigned</span>
                            )}
                            {task.dueDate && (
                              <span
                                className={cn(
                                  "ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                                  overdue
                                    ? "bg-danger-soft text-danger"
                                    : "bg-secondary text-muted-foreground",
                                )}
                              >
                                <CalendarClock className="size-3" />
                                {relativeDays(task.dueDate)}
                              </span>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TaskDetailDialog
        task={selected}
        projects={projects}
        editors={editors}
        deliverables={deliverables}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function SaveButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {isEdit ? "Save" : "Create task"}
    </Button>
  );
}

function TaskDialog({
  task,
  projects,
  editors,
  deliverables,
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  task?: BoardTask;
  projects: { id: string; name: string }[];
  editors: Option[];
  deliverables: { id: string; name: string; projectId: string }[];
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [uncontrolled, setUncontrolled] = React.useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;
  const [state, formAction] = useActionState<ActionState, FormData>(savePostTaskAction, {});
  const [projectId, setProjectId] = React.useState(task?.project.id ?? "");

  React.useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success(task ? "Task updated" : "Task created");
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const err = state.fieldErrors ?? {};
  const projectDeliverables = deliverables.filter((d) => d.projectId === projectId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New edit task"}</DialogTitle>
        </DialogHeader>

        <form action={formAction}>
          {task && <input type="hidden" name="id" value={task.id} />}

          <DialogBody className="grid gap-4 sm:grid-cols-2">
            {state.error && (
              <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger sm:col-span-2">
                {state.error}
              </div>
            )}

            <Field label="Title" htmlFor="title" required className="sm:col-span-2" error={err.title}>
              <Input
                id="title"
                name="title"
                defaultValue={task?.title ?? ""}
                placeholder="Highlight film — first cut"
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

            <Field label="Deliverable" htmlFor="deliverableId" error={err.deliverableId}>
              <NativeSelect
                id="deliverableId"
                name="deliverableId"
                defaultValue={task?.deliverable?.id ?? ""}
              >
                <option value="">None</option>
                {projectDeliverables.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Assignee" htmlFor="assigneeId" error={err.assigneeId}>
              <NativeSelect id="assigneeId" name="assigneeId" defaultValue={task?.assignee?.id ?? ""}>
                <option value="">Unassigned</option>
                {editors.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Due date" htmlFor="dueDate" error={err.dueDate}>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                defaultValue={task?.dueDate ? task.dueDate.slice(0, 10) : ""}
              />
            </Field>

            <Field label="Status" htmlFor="status" error={err.status}>
              <NativeSelect id="status" name="status" defaultValue={task?.status ?? "NOT_STARTED"}>
                {Object.entries(POST_STATUS).map(([value, m]) => (
                  <option key={value} value={value}>
                    {m.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Priority" htmlFor="priority" error={err.priority}>
              <NativeSelect id="priority" name="priority" defaultValue={task?.priority ?? "NORMAL"}>
                {Object.entries(PRIORITY).map(([value, m]) => (
                  <option key={value} value={value}>
                    {m.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Notes" htmlFor="description" className="sm:col-span-2" error={err.description}>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={task?.description ?? ""}
                placeholder="Reference links, music choice, specific shots to include."
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SaveButton isEdit={Boolean(task)} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailDialog({
  task,
  projects,
  editors,
  deliverables,
  onClose,
}: {
  task: BoardTask | null;
  projects: { id: string; name: string }[];
  editors: Option[];
  deliverables: { id: string; name: string; projectId: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [note, setNote] = React.useState("");
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    setUrl("");
    setNote("");
  }, [task?.id]);

  if (!task) return null;

  const m = meta(POST_STATUS, task.status);
  const p = meta(PRIORITY, task.priority);

  return (
    <>
      <Dialog open={!editOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{task.title}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              <Link href={`/projects/${task.project.id}`} className="hover:text-primary">
                {task.project.name}
              </Link>
              {task.deliverable ? ` · ${task.deliverable.name}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant={m.variant}>{m.label}</Badge>
              <Badge variant={p.variant}>{p.label}</Badge>
              {task.dueDate && <Badge variant="outline">Due {formatDate(task.dueDate)}</Badge>}
            </div>
          </DialogHeader>

          <DialogBody className="space-y-5">
            {task.description && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Assignee:</span>
              {task.assignee ? (
                <span className="inline-flex items-center gap-2">
                  <Avatar name={task.assignee.name} size="sm" />
                  {task.assignee.name}
                </span>
              ) : (
                <span className="text-muted-foreground">Unassigned</span>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold">Versions</h3>

              {task.versions.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No versions yet. Add a review link once the first cut is ready.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {task.versions.map((v) => (
                    <li key={v.id} className="flex items-center gap-3 py-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold">
                        v{v.version}
                      </span>
                      <div className="min-w-0 flex-1">
                        {v.note && <p className="truncate text-sm">{v.note}</p>}
                        <p className="text-xs text-muted-foreground">
                          {v.uploadedBy ?? "Someone"} · {relativeDays(v.createdAt)}
                        </p>
                      </div>

                      {v.url && (
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground transition-colors hover:text-primary"
                          aria-label="Open version"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      )}

                      {v.isShared ? (
                        <Badge variant="success">Shared</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            start(async () => {
                              const result = await shareVersionAction(v.id);
                              if (!result?.ok) {
                                toast.error(result?.error ?? "Could not share");
                                return;
                              }
                              toast.success("Shared with the client");
                              router.refresh();
                            })
                          }
                        >
                          <Send />
                          Share
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 space-y-3 rounded-lg border border-border p-4">
                <Field label="Review link" htmlFor="v-url">
                  <Input
                    id="v-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://vimeo.com/… or a Drive link"
                  />
                </Field>
                <Field label="Note" htmlFor="v-note">
                  <Input
                    id="v-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="First cut, 4:32, no colour yet"
                  />
                </Field>
                <Button
                  className="w-full"
                  disabled={pending || (!url && !note)}
                  onClick={() =>
                    start(async () => {
                      const result = await addTaskVersionAction(task.id, url, note);
                      if (result?.error) {
                        toast.error(result.error);
                        return;
                      }
                      toast.success("Version added");
                      setUrl("");
                      setNote("");
                      router.refresh();
                      onClose();
                    })
                  }
                >
                  {pending ? <Loader2 className="animate-spin" /> : <Plus />}
                  Add version
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
                  await deletePostTaskAction(task.id);
                  toast.success("Task deleted");
                  onClose();
                  router.refresh();
                })
              }
            >
              <Trash2 />
              Delete
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button onClick={onClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDialog
        task={task}
        projects={projects}
        editors={editors}
        deliverables={deliverables}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) onClose();
        }}
      />
    </>
  );
}
