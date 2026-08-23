import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // A brand new studio finishes the two-step wizard before entering the app.
  if (!user.studio.onboardedAt) redirect("/onboarding/profile");

  const studioId = user.studioId;

  const [newEnquiries, openRequests, activePostTasks, notifications] = await Promise.all([
    prisma.enquiry.count({ where: { studioId, status: { in: ["NEW", "FOLLOW_UP", "REVISE"] } } }),
    prisma.clientRequest.count({ where: { studioId, status: { in: ["NEW", "PENDING"] } } }),
    prisma.postTask.count({
      where: { studioId, status: { in: ["NOT_STARTED", "IN_PROGRESS", "CHANGES_REQUESTED"] } },
    }),
    prisma.notification.findMany({
      // Studio-wide notifications have a null userId.
      where: { studioId, isRead: false, OR: [{ userId: user.id }, { userId: null }] },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        studioName: user.studio.name,
        avatarUrl: user.avatarUrl,
      }}
      counts={{
        enquiries: newEnquiries,
        requests: openRequests,
        postProduction: activePostTasks,
      }}
      notifications={notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        href: n.href,
        createdAt: n.createdAt.toISOString(),
      }))}
    >
      {children}
    </AppShell>
  );
}
