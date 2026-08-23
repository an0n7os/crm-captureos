import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { ProjectForm } from "@/components/projects/project-form";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const [project, clients, managers] = await Promise.all([
    prisma.project.findFirst({ where: { id, studioId: user.studioId } }),
    prisma.client.findMany({
      where: { studioId: user.studioId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { studioId: user.studioId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!project) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Link
        href={`/projects/${project.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to project
      </Link>

      <PageHeader title="Edit project" description={project.code} />

      <ProjectForm
        clients={clients}
        managers={managers}
        values={{
          id: project.id,
          clientId: project.clientId,
          name: project.name,
          eventType: project.eventType,
          status: project.status,
          venue: project.venue,
          city: project.city,
          packageValue: project.packageValue.toString(),
          managerId: project.managerId,
          notes: project.notes,
        }}
      />
    </div>
  );
}
