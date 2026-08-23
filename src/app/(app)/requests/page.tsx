import type { Metadata } from "next";

import { RequestList } from "@/components/requests/request-list";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Client Requests" };

type SearchParams = Promise<{ status?: string; projectId?: string }>;

export default async function RequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const studioId = user.studioId;
  const status = sp.status ?? "open";

  const statusWhere =
    status === "all"
      ? {}
      : status === "open"
        ? { status: { in: ["NEW", "PENDING", "IN_PROGRESS"] as never } }
        : { status: status as never };

  const [requests, projects, counts] = await Promise.all([
    prisma.clientRequest.findMany({
      where: {
        studioId,
        ...statusWhere,
        ...(sp.projectId ? { projectId: sp.projectId } : {}),
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        project: { select: { id: true, name: true } },
        client: { select: { name: true } },
        task: { select: { id: true, title: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            body: true,
            authorName: true,
            fromPortal: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.project.findMany({
      where: { studioId, status: { notIn: ["CANCELLED"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
    prisma.clientRequest.groupBy({
      by: ["status"],
      where: { studioId },
      _count: { _all: true },
    }),
  ]);

  const tasks = await prisma.postTask.findMany({
    where: { studioId, ...(sp.projectId ? { projectId: sp.projectId } : {}) },
    select: { id: true, title: true, projectId: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Client Requests"
        description="Revision requests and feedback, with the full thread in one place."
      />

      <RequestList
        requests={requests.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          status: r.status,
          priority: r.priority,
          fromPortal: r.fromPortal,
          createdAt: r.createdAt.toISOString(),
          project: r.project,
          clientName: r.client?.name ?? null,
          task: r.task,
          comments: r.comments.map((c) => ({
            id: c.id,
            body: c.body,
            authorName: c.authorName,
            fromPortal: c.fromPortal,
            createdAt: c.createdAt.toISOString(),
          })),
        }))}
        projects={projects}
        tasks={tasks}
        counts={Object.fromEntries(counts.map((c) => [c.status, c._count._all]))}
        filters={{ status, projectId: sp.projectId ?? "" }}
      />
    </div>
  );
}
