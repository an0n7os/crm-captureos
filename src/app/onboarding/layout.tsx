import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { requireUser } from "@/lib/session";

/**
 * Wizard chrome. Once onboarding is finished the whole flow redirects away, so
 * a finished studio can never land back on step one by typing the URL.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.studio.onboardedAt) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-xl">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
