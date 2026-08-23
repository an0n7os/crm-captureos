import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { ProjectForm } from "@/components/projects/project-form";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage() {
  const user = await requireUser();

  const [clients, managers] = await Promise.all([
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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to projects
      </Link>

      <PageHeader
        title="New project"
        description="Your default deliverables are added automatically."
      />

      <ProjectForm clients={clients} managers={managers} values={{ managerId: user.id }} />
    </div>
  );
}
