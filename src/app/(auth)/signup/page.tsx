import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { SignupForm } from "./signup-form";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Create your studio" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight">Create your studio</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Set up your workspace in under a minute.
        </p>
      </div>

      <SignupForm />

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
