import type { Metadata } from "next";

import { PackagesPanel } from "@/components/settings/packages-panel";
import { MoreLinks } from "@/components/settings/more-links";
import { ServicesPanel } from "@/components/settings/services-panel";
import { StudioProfileForm } from "@/components/settings/studio-profile-form";
import { TemplatesPanel } from "@/components/settings/templates-panel";
import { UsersPanel } from "@/components/settings/users-panel";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const studioId = user.studioId;

  const [packages, templates, users, services] = await Promise.all([
    prisma.package.findMany({ where: { studioId }, orderBy: { sortOrder: "asc" } }),
    prisma.deliverableTemplate.findMany({ where: { studioId }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({
      where: { studioId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
      },
    }),
    prisma.serviceItem.findMany({ where: { studioId }, orderBy: { sortOrder: "asc" } }),
  ]);

  const canAdminister = user.role === "OWNER" || user.role === "ADMIN";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <PageHeader
        title="Settings"
        description="Studio profile, packages, templates and who can sign in."
      />

      <StudioProfileForm
        canEdit={canAdminister}
        values={{
          name: user.studio.name,
          logoUrl: user.studio.logoUrl,
          whatsappNumber: user.studio.whatsappNumber,
          ownerName: user.name,
          avatarUrl: user.avatarUrl,
          email: user.studio.email,
          phone: user.studio.phone,
          website: user.studio.website,
          gstNumber: user.studio.gstNumber,
          addressLine: user.studio.addressLine,
          city: user.studio.city,
          state: user.studio.state,
          pincode: user.studio.pincode,
          currency: user.studio.currency,
        }}
      />

      <PackagesPanel
        currency={user.studio.currency}
        packages={packages.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: toNumber(p.price),
          inclusions: p.inclusions,
        }))}
      />

      <ServicesPanel
        currency={user.studio.currency}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          unitPrice: toNumber(s.unitPrice),
        }))}
      />

      <TemplatesPanel
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          dueInDays: t.dueInDays,
        }))}
      />

      <MoreLinks />

      <UsersPanel
        canAdminister={canAdminister}
        currentUserId={user.id}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
