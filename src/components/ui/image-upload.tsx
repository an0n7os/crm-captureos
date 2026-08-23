"use client";

import * as React from "react";
import { Camera, ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Uploads to /api/upload and reports back the stored URL. The value is also
 * mirrored into a hidden input so it submits with a plain server-action form.
 */
export function ImageUpload({
  name,
  value,
  onChange,
  label,
  hint,
  shape = "square",
  className,
}: {
  name?: string;
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
  shape?: "square" | "circle" | "wide";
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/upload", { method: "POST", body });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Upload failed");
        return;
      }
      onChange(data.url);
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed — check your connection");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const box =
    shape === "circle"
      ? "size-20 rounded-full"
      : shape === "wide"
        ? "aspect-video w-full rounded-lg"
        : "size-20 rounded-lg";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {name && <input type="hidden" name={name} value={value ?? ""} />}

      <div className={cn(shape === "wide" ? "block" : "flex items-center gap-4")}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden border border-dashed border-input bg-muted/50 transition-colors hover:border-ring hover:bg-muted",
            box,
          )}
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1.5 px-3 text-center">
              <ImageIcon className="size-5 text-muted-foreground" />
              {shape === "wide" && (
                <span className="text-xs text-muted-foreground">
                  {label ?? "Click to upload"}
                </span>
              )}
            </span>
          )}
        </button>

        {shape !== "wide" && (
          <div className="min-w-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Camera />
              {value ? "Replace" : (label ?? "Upload")}
            </Button>
            {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
          </div>
        )}
      </div>

      {shape === "wide" && hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}

      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-danger"
        >
          <X className="size-3" />
          Remove
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
    </div>
  );
}
