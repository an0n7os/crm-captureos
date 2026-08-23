"use client";

import * as React from "react";
import { FileSignature, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import {
  deleteContractAction,
  saveContractAction,
  updateContractStatusAction,
} from "@/lib/actions/contract-actions";
import { formatDateTime } from "@/lib/utils";

const STATUS: Record<string, { label: string; variant: "default" | "info" | "success" | "danger" }> = {
  DRAFT: { label: "Draft", variant: "default" },
  SENT: { label: "Sent", variant: "info" },
  SIGNED: { label: "Signed", variant: "success" },
  DECLINED: { label: "Declined", variant: "danger" },
};

export type ContractValues = {
  title: string;
  body: string;
  status: string;
  shareToken: string;
  signerName: string | null;
  signedAt: string | null;
} | null;

export function ContractTab({
  projectId,
  contract,
  suggestedTitle,
  suggestedBody,
}: {
  projectId: string;
  contract: ContractValues;
  suggestedTitle: string;
  suggestedBody: string;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState(contract?.title ?? suggestedTitle);
  const [body, setBody] = React.useState(contract?.body ?? suggestedBody);
  const [pending, start] = React.useTransition();

  const signed = contract?.status === "SIGNED";
  const [url, setUrl] = React.useState("");
  React.useEffect(() => {
    if (contract) setUrl(`${window.location.origin}/c/${contract.shareToken}`);
  }, [contract]);

  function save() {
    start(async () => {
      const result = await saveContractAction(projectId, title, body);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Contract saved");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Contract</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Write it once, send the link, let the client sign online.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {contract && (
              <Badge variant={STATUS[contract.status]?.variant ?? "default"}>
                {STATUS[contract.status]?.label ?? contract.status}
              </Badge>
            )}

            {contract && (
              <NativeSelect
                className="h-9 w-32 text-xs"
                value={contract.status}
                disabled={pending}
                onChange={(e) =>
                  start(async () => {
                    const result = await updateContractStatusAction(projectId, e.target.value);
                    if (!result?.ok) {
                      toast.error(result?.error ?? "Could not update");
                      return;
                    }
                    toast.success("Status updated");
                    router.refresh();
                  })
                }
              >
                {Object.entries(STATUS).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </NativeSelect>
            )}
          </div>
        </div>

        {signed && (
          <div className="mt-4 rounded-lg border border-success/30 bg-success-soft px-4 py-3">
            <p className="text-sm font-medium text-success">
              Signed by {contract?.signerName ?? "the client"}
            </p>
            <p className="mt-0.5 text-xs text-success/80">
              {contract?.signedAt ? formatDateTime(contract.signedAt) : ""} — editing is locked to
              keep the signed copy intact.
            </p>
          </div>
        )}

        {contract && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Signing link</p>
              <p className="truncate text-sm">{url}</p>
            </div>
            <CopyLinkButton url={url} />
          </div>
        )}

        <div className="mt-5 flex flex-col gap-4">
          <Field label="Title" htmlFor="contract-title">
            <Input
              id="contract-title"
              value={title}
              disabled={signed}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>

          <Field
            label="Terms"
            htmlFor="contract-body"
            hint="Plain text. Your studio details and the client's name appear automatically on the signing page."
          >
            <Textarea
              id="contract-body"
              rows={20}
              value={body}
              disabled={signed}
              onChange={(e) => setBody(e.target.value)}
              className="font-mono text-[13px] leading-relaxed"
            />
          </Field>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          {contract && (
            <Button
              variant="ghost"
              className="mr-auto text-danger hover:bg-danger-soft"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await deleteContractAction(projectId);
                  toast.success("Contract deleted");
                  router.refresh();
                })
              }
            >
              <Trash2 />
              Delete
            </Button>
          )}

          <Button onClick={save} disabled={pending || signed}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />}
            {contract ? "Save contract" : "Create contract"}
          </Button>
        </div>
      </Card>

      {!contract && (
        <Card className="flex items-center gap-3 border-info/30 bg-info-soft p-4">
          <FileSignature className="size-4 shrink-0 text-info" />
          <p className="text-sm text-info">
            The starting text below is a plain-language template. Have a lawyer review it before you
            rely on it for real bookings.
          </p>
        </Card>
      )}
    </div>
  );
}
