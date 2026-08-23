"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteQuotationAction, updateQuotationStatusAction } from "@/lib/actions/finance-actions";
import { QUOTATION_STATUS, meta } from "@/lib/status";
import { cn } from "@/lib/utils";

export function QuotationActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [current, setCurrent] = React.useState(status);
  const [pending, start] = React.useTransition();

  React.useEffect(() => setCurrent(status), [status]);

  const m = meta(QUOTATION_STATUS, current);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={pending}
          className={cn(
            "inline-flex h-9.5 items-center gap-1.5 rounded-lg border border-border bg-card px-3 transition-colors hover:bg-secondary",
            pending && "opacity-60",
          )}
        >
          <Badge variant={m.variant}>{m.label}</Badge>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {Object.entries(QUOTATION_STATUS).map(([value, option]) => (
          <DropdownMenuItem
            key={value}
            disabled={value === current}
            onClick={() => {
              const previous = current;
              setCurrent(value);
              start(async () => {
                const result = await updateQuotationStatusAction(id, value);
                if (!result?.ok) {
                  setCurrent(previous);
                  toast.error(result?.error ?? "Could not update");
                  return;
                }
                toast.success(`Marked ${option.label.toLowerCase()}`);
                router.refresh();
              });
            }}
          >
            {option.label}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="danger"
          onClick={() =>
            start(async () => {
              await deleteQuotationAction(id);
              toast.success("Quotation deleted");
            })
          }
        >
          <Trash2 />
          Delete quotation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
