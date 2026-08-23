"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ExternalLink, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { Field, Input, Textarea } from "@/components/ui/input";
import { QrCodeButton } from "@/components/ui/qr-code";
import { saveLeadPageAction } from "@/lib/actions/lead-actions";
import { DEFAULT_HEADING, DEFAULT_SUBTEXT } from "@/lib/defaults";
import type { ActionState } from "@/lib/validators";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Save />}
      Save page
    </Button>
  );
}

export function LandingPagePanel({
  values,
  studioName,
}: {
  values: {
    slug: string;
    enabled: boolean;
    coverUrl: string | null;
    heading: string;
    subtext: string;
  };
  studioName: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionState, FormData>(saveLeadPageAction, {});

  const [slug, setSlug] = React.useState(values.slug);
  const [cover, setCover] = React.useState(values.coverUrl);
  const [heading, setHeading] = React.useState(values.heading);
  const [subtext, setSubtext] = React.useState(values.subtext);
  const [enabled, setEnabled] = React.useState(values.enabled);

  const [origin, setOrigin] = React.useState("");
  React.useEffect(() => setOrigin(window.location.origin), []);

  React.useEffect(() => {
    if (state.ok) {
      toast.success("Landing page saved");
      router.refresh();
    }
  }, [state, router]);

  const url = `${origin}/lead/${slug || "your-studio"}`;
  const err = state.fieldErrors ?? {};

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <form action={formAction} className="flex flex-col gap-4">
        <Card className="p-5">
          <h2 className="text-sm font-semibold">Your public enquiry link</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Put this in your Instagram bio. Every submission lands straight in your pipeline.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <Field label="Link name" htmlFor="enquirySlug" error={err.enquirySlug} className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 text-sm text-muted-foreground">/lead/</span>
                <Input
                  id="enquirySlug"
                  name="enquirySlug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="frames-and-co"
                />
              </div>
            </Field>

            <CopyLinkButton url={url} />

            <Button variant="outline" size="sm" asChild>
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink />
                Preview
              </a>
            </Button>

            <QrCodeButton url={url} filename="enquiry-link" />
          </div>

          <p className="mt-2 truncate text-xs text-muted-foreground">{url}</p>

          <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              name="enquiryEnabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="mt-0.5 size-4 rounded border-input accent-[var(--color-primary)]"
            />
            <span>
              Accept submissions
              <span className="block text-xs text-muted-foreground">
                Turn this off to close the form without deleting the page.
              </span>
            </span>
          </label>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold">Cover photo</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            16:9 works best — around 1920×1080. Up to 2 MB.
          </p>
          <div className="mt-4">
            <ImageUpload
              name="enquiryCoverUrl"
              value={cover}
              onChange={setCover}
              shape="wide"
              label="Click to upload a cover photo"
            />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold">Page text</h2>
          <div className="mt-4 flex flex-col gap-4">
            <Field label="Heading" htmlFor="enquiryHeading">
              <Input
                id="enquiryHeading"
                name="enquiryHeading"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder={DEFAULT_HEADING}
              />
            </Field>

            <Field label="Sub-text" htmlFor="enquirySubtext">
              <Textarea
                id="enquirySubtext"
                name="enquirySubtext"
                rows={3}
                value={subtext}
                onChange={(e) => setSubtext(e.target.value)}
                placeholder={DEFAULT_SUBTEXT}
              />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end">
          <SaveButton />
        </div>
      </form>

      {/* Live preview */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Preview
        </p>

        <Card className="overflow-hidden">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="aspect-video w-full object-cover" />
          ) : (
            <div className="aspect-video w-full bg-gradient-to-br from-primary/25 via-primary/10 to-transparent" />
          )}

          <div className="p-5">
            <p className="text-base font-semibold tracking-tight">
              {heading || DEFAULT_HEADING}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{subtext || DEFAULT_SUBTEXT}</p>

            <div className="mt-4 space-y-2">
              {[
                "Your name",
                "Phone or email",
                "Event details",
                "Location or venue",
                "Number of guests",
                "Budget",
                "How did you find us?",
              ].map((placeholder) => (
                <div
                  key={placeholder}
                  className="rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground/70"
                >
                  {placeholder}
                </div>
              ))}
              <div className="rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-medium text-primary-foreground">
                Send enquiry
              </div>
            </div>
          </div>
        </Card>

        <p className="mt-3 text-xs text-muted-foreground">
          {studioName}&apos;s branding and contact details show automatically.
        </p>
      </div>
    </div>
  );
}
