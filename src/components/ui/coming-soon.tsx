import Link from "next/link";
import { Hammer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";

/**
 * Placeholder for modules scheduled in a later build phase. Keeps every nav
 * link resolvable instead of 404-ing while the module is being written.
 */
export function ComingSoon({
  title,
  description,
  phase,
  features,
}: {
  title: string;
  description: string;
  phase: string;
  features: string[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={title} description={description} />

      <Card className="p-8">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-secondary">
            <Hammer className="size-5 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm font-medium">Being built in {phase}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The data model for this module is already in place — the screens land next.
          </p>

          <ul className="mt-6 space-y-2 text-left">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-muted-foreground">{f}</span>
              </li>
            ))}
          </ul>

          <Button variant="outline" className="mt-7" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
