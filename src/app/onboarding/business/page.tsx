import type { Metadata } from "next";

import { BusinessStepForm } from "@/components/onboarding/business-step-form";
import { Steps } from "@/components/onboarding/steps";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "How you work" };

export default async function OnboardingBusinessPage() {
  const user = await requireUser();

  return (
    <>
      <div className="mt-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">How you work</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Last step. These set the defaults on your quotes and invoices — all of it is editable
          later.
        </p>
      </div>

      <Steps current={2} />

      <BusinessStepForm currency={user.studio.currency} />
    </>
  );
}
