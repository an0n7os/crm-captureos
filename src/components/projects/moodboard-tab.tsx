"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { Field, Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { addMoodboardItemAction, deleteMoodboardItemAction } from "@/lib/actions/contract-actions";

export type MoodboardItem = {
  id: string;
  imageUrl: string | null;
  linkUrl: string | null;
  caption: string | null;
};

/** Visual references the crew and editors work from. */
export function MoodboardTab({
  projectId,
  items,
}: {
  projectId: string;
  items: MoodboardItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [caption, setCaption] = React.useState("");
  const [pending, start] = React.useTransition();

  function add() {
    start(async () => {
      const result = await addMoodboardItemAction(projectId, imageUrl ?? "", linkUrl, caption);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setImageUrl(null);
      setLinkUrl("");
      setCaption("");
      setOpen(false);
      toast.success("Added to the moodboard");
      router.refresh();
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Moodboard</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Reference shots and links so the crew and editors match the look the client wants.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          <Plus />
          Add reference
        </Button>
      </div>

      {open && (
        <div className="mt-4 grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
          <Field label="Image">
            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              shape="wide"
              label="Click to upload"
              hint="JPG, PNG or WebP, up to 2 MB."
            />
          </Field>

          <div className="flex flex-col gap-4">
            <Field label="Or a reference link" htmlFor="mb-link">
              <Input
                id="mb-link"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://pin.it/…"
              />
            </Field>

            <Field label="Caption" htmlFor="mb-caption">
              <Input
                id="mb-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Warm tones, backlit, no heavy retouching"
              />
            </Field>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={add} disabled={pending || (!imageUrl && !linkUrl)}>
                {pending ? <Loader2 className="animate-spin" /> : <Plus />}
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Nothing on the moodboard yet"
          description="Add the shots and links the client sent you, so nobody has to dig through chat later."
        />
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <figure
              key={item.id}
              className="group relative overflow-hidden rounded-lg border border-border"
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.caption ?? ""}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <a
                  href={item.linkUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-muted/50 p-4 text-center transition-colors hover:bg-muted"
                >
                  <ExternalLink className="size-5 text-muted-foreground" />
                  <span className="line-clamp-3 text-xs text-muted-foreground">
                    {item.linkUrl}
                  </span>
                </a>
              )}

              {item.caption && (
                <figcaption className="border-t border-border px-2.5 py-2 text-xs text-muted-foreground">
                  {item.caption}
                </figcaption>
              )}

              <DeleteItem id={item.id} />
            </figure>
          ))}
        </div>
      )}
    </Card>
  );
}

function DeleteItem({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <button
      type="button"
      aria-label="Remove reference"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteMoodboardItemAction(id);
          toast.success("Removed");
          router.refresh();
        })
      }
      className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-md bg-black/55 text-white opacity-0 transition-opacity hover:bg-black/75 group-hover:opacity-100"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </button>
  );
}
