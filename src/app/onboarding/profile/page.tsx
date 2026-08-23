import type { Metadata } from "next";

import { ProfileStepForm } from "@/components/onboarding/profile-step-form";
import { Steps } from "@/components/onboarding/steps";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Set up your studio" };

export default async function OnboardingProfilePage() {
  const user = await requireUser();

  return (
    <>
      <div className="mt-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Set up your studio</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          A few details so quotes, invoices and your client portal look like you. Takes about two
          minutes.
        </p>
      </div>

      <Steps current={1} />

      <ProfileStepForm
        defaults={{
          ownerName: user.name,
          studioName: user.studio.name,
          avatarUrl: user.avatarUrl,
          logoUrl: user.studio.logoUrl,
        }}
      />
    </>
  );
}
