"use client";

import * as React from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, NativeSelect, Textarea } from "@/components/ui/input";
import { sendFeedbackAction } from "@/lib/actions/feedback-actions";

/**
 * Feedback form on the help page. It used to float over every screen, which
 * covered page content, so it lives here instead.
 */
export function FeedbackCard({ whatsappNumber }: { whatsappNumber: string | null }) {
  const [kind, setKind] = React.useState("IDEA");
  const [message, setMessage] = React.useState("");
  const [pending, start] = React.useTransition();

  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}`
    : null;

  function send() {
    start(async () => {
      const result = await sendFeedbackAction(kind, message);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setMessage("");
      toast.success("Thanks — that's been logged.");
    });
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Send feedback</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Bugs, ideas, anything that got in your way. It reaches the studio owner&apos;s
            notifications.
          </p>
        </div>

        {whatsappHref && (
          <Button variant="outline" size="sm" asChild>
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              <MessageCircle />
              Get help on WhatsApp
            </a>
          </Button>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[200px_1fr]">
        <Field label="Type" htmlFor="fb-kind">
          <NativeSelect id="fb-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="IDEA">An idea</option>
            <option value="BUG">Something is broken</option>
            <option value="QUESTION">A question</option>
            <option value="OTHER">Something else</option>
          </NativeSelect>
        </Field>

        <Field label="Message" htmlFor="fb-message">
          <Textarea
            id="fb-message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What happened, and what did you expect instead?"
          />
        </Field>
      </div>

      <div className="mt-3 flex justify-end">
        <Button onClick={send} disabled={pending || !message.trim()}>
          {pending ? <Loader2 className="animate-spin" /> : <Send />}
          Send feedback
        </Button>
      </div>
    </Card>
  );
}
