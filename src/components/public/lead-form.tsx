"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { submitLeadAction, trackLeadPageViewAction } from "@/lib/actions/lead-actions";

const SOURCES = [
  ["INSTAGRAM", "Instagram"],
  ["GOOGLE", "Google search"],
  ["REFERRAL", "A friend or family"],
  ["FACEBOOK", "Facebook"],
  ["VENDOR", "Another vendor"],
  ["OTHER", "Somewhere else"],
] as const;

const EMPTY = {
  name: "",
  contact: "",
  eventDetails: "",
  venue: "",
  guests: "",
  budget: "",
  source: "",
};

export function LeadForm({ slug, studioId }: { studioId: string; slug: string }) {
  const [values, setValues] = React.useState(EMPTY);
  const [sent, setSent] = React.useState(false);
  const [pending, start] = React.useTransition();

  // Counted once per mount so the analytics tab can show a conversion rate.
  React.useEffect(() => {
    trackLeadPageViewAction(studioId, document.referrer || null).catch(() => {});
  }, [studioId]);

  function set(key: keyof typeof EMPTY, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    start(async () => {
      const result = await submitLeadAction(slug, values);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setSent(true);
      setValues(EMPTY);
    });
  }

  if (sent) {
    return (
      <div className="mt-6 flex flex-col items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-4 py-10 text-center">
        <CheckCircle2 className="size-6 text-success" />
        <p className="text-sm font-medium text-success">Thanks — we've got your details.</p>
        <p className="text-sm text-success/80">
          Someone from the team will be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
      <Input
        required
        value={values.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder="Your name"
      />

      <Input
        required
        value={values.contact}
        onChange={(e) => set("contact", e.target.value)}
        placeholder="Phone or email"
      />

      <Textarea
        rows={3}
        value={values.eventDetails}
        onChange={(e) => set("eventDetails", e.target.value)}
        placeholder="Event details — dates, what you're planning, what coverage you want"
      />

      <Input
        value={values.venue}
        onChange={(e) => set("venue", e.target.value)}
        placeholder="Location or venue"
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          value={values.guests}
          onChange={(e) => set("guests", e.target.value)}
          inputMode="numeric"
          placeholder="Number of guests"
        />
        <Input
          value={values.budget}
          onChange={(e) => set("budget", e.target.value)}
          inputMode="numeric"
          placeholder="Budget"
        />
      </div>

      <NativeSelect value={values.source} onChange={(e) => set("source", e.target.value)}>
        <option value="">How did you find us?</option>
        {SOURCES.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </NativeSelect>

      <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Send />}
        Send enquiry
      </Button>
    </form>
  );
}
