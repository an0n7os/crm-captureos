"use client";

import * as React from "react";
import QRCode from "qrcode";
import { Download, QrCode as QrIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Renders a share link as a QR code the studio can print or hand over.
 * Generated in the browser, so no image ever has to be stored.
 */
export function QrCodeButton({
  url,
  label = "QR code",
  filename = "qr-code",
}: {
  url: string;
  label?: string;
  filename?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [dataUrl, setDataUrl] = React.useState("");

  React.useEffect(() => {
    if (!open || !url) return;

    QRCode.toDataURL(url, {
      width: 640,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#14161f", light: "#ffffff" },
    })
      .then(setDataUrl)
      .catch(() => toast.error("Could not generate the QR code"));
  }, [open, url]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrIcon />
          {label}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Scan to open</DialogTitle>
        </DialogHeader>

        <DialogBody className="flex flex-col items-center gap-4">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt="QR code"
              className="size-56 rounded-lg border border-border bg-white p-2"
            />
          ) : (
            <div className="size-56 animate-pulse rounded-lg bg-muted" />
          )}

          <p className="break-all text-center text-xs text-muted-foreground">{url}</p>

          <Button
            variant="outline"
            className="w-full"
            disabled={!dataUrl}
            onClick={() => {
              const link = document.createElement("a");
              link.href = dataUrl;
              link.download = `${filename}.png`;
              link.click();
            }}
          >
            <Download />
            Download PNG
          </Button>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
