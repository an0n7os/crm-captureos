import type { Metadata } from "next";

import { PostBoard } from "@/components/post/post-board";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Post Production" };

type SearchParams = Promise<{ projectId?: string; assigneeId?: string }>;

export default async function PostProductionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const studioId = user.studioId;

  const [tasks, projects, editors] = await Promise.all([
    prisma.postTask.findMany({
      where: {
        studioId,
        ...(sp.projectId ? { projectId: sp.projectId } : {}),
        ...(sp.assigneeId ? { assigneeId: sp.assigneeId } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        project: { select: { id: true, name: true, code: true } },
        assignee: { select: { id: true, name: true } },
        deliverable: { select: { id: true, name: true } },
        versions: {
          orderBy: { version: "desc" },
          include: { uploadedBy: { select: { name: true } } },
        },
        _count: { select: { clientRequests: true } },
      },
    }),
    prisma.project.findMany({
      where: { studioId, status: { notIn: ["CANCELLED"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.user.findMany({
      where: { studioId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const deliverables = await prisma.deliverable.findMany({
    where: { studioId, ...(sp.projectId ? { projectId: sp.projectId } : {}) },
    select: { id: true, name: true, projectId: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Post Production"
        description="Every edit from raw footage to approved delivery. Drag a card to move it."
      />

      <PostBoard
        tasks={tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate?.toISOString() ?? null,
          project: t.project,
          assignee: t.assignee,
          deliverable: t.deliverable,
          requestCount: t._count.clientRequests,
          versions: t.versions.map((v) => ({
            id: v.id,
            version: v.version,
            url: v.url,
            note: v.note,
            isShared: v.isShared,
            uploadedBy: v.uploadedBy?.name ?? null,
            createdAt: v.createdAt.toISOString(),
          })),
        }))}
        projects={projects}
        editors={editors}
        deliverables={deliverables}
        filters={{ projectId: sp.projectId ?? "", assigneeId: sp.assigneeId ?? "" }}
      />
    </div>
  );
}
