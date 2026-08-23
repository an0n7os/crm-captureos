"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { deleteTemplateAction, saveTemplateAction } from "@/lib/actions/settings-actions";

export type TemplateValues = { id: string; name: string; dueInDays: number };

/**
 * Deliverable templates are copied onto every new project, so a studio never
 * has to retype "album, highlight film, teaser" for each booking.
 */
export function TemplatesPanel({ templates }: { templates: TemplateValues[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [dueInDays, setDueInDays] = React.useState(30);
  const [pending, start] = React.useTransition();

  function add() {
    if (!name.trim()) {
      toast.error("Enter a name");
      return;
    }
    start(async () => {
      const result = await saveTemplateAction(name, dueInDays);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setName("");
      setDueInDays(30);
      toast.success("Template added");
      router.refresh();
    });
  }

  return (
    <Card className="p-5">
      <div>
        <h2 className="text-sm font-semibold">Default deliverables</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Added automatically to every new project, with the due date offset from the event.
        </p>
      </div>

      {templates.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  Due {t.dueInDays} days after the event
                </p>
              </div>
              <DeleteTemplate id={t.id} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label="Deliverable" htmlFor="t-name">
          <Input
            id="t-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Highlight film"
          />
        </Field>

        <Field label="Days after event" htmlFor="t-days">
          <Input
            id="t-days"
            type="number"
            min={0}
            className="w-36"
            value={dueInDays}
            onChange={(e) => setDueInDays(Math.max(0, Number(e.target.value) || 0))}
          />
        </Field>

        <Button onClick={add} disabled={pending || !name.trim()}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />}
          Add
        </Button>
      </div>
    </Card>
  );
}

function DeleteTemplate({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Delete template"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteTemplateAction(id);
          toast.success("Template removed");
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
    </Button>
  );
}
