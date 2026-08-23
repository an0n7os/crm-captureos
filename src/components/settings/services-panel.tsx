"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import {
  deleteServiceItemAction,
  saveServiceItemAction,
} from "@/lib/actions/quotation-actions";
import { formatCurrency } from "@/lib/utils";

export type ServiceRow = { id: string; name: string; unitPrice: number };

/** The crew roles the quotation builder offers per event. */
export function ServicesPanel({
  services,
  currency,
}: {
  services: ServiceRow[];
  currency: string;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [pending, start] = React.useTransition();

  function add() {
    start(async () => {
      const result = await saveServiceItemAction(name, Number(price) || 0);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setName("");
      setPrice("");
      toast.success("Service added");
      router.refresh();
    });
  }

  return (
    <Card className="p-5">
      <div>
        <h2 className="text-sm font-semibold">Services</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The crew roles you pick from when building a quotation itinerary.
        </p>
      </div>

      {services.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Camera className="size-4" />
          No services yet — add the roles you book most.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {services.map((service) => (
            <li key={service.id} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{service.name}</span>
              <span className="shrink-0 text-sm tabular text-muted-foreground">
                {service.unitPrice > 0 ? formatCurrency(service.unitPrice, currency) : "No default"}
              </span>
              <RemoveService id={service.id} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label="Service" htmlFor="svc-name">
          <Input
            id="svc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Candid photographer"
          />
        </Field>

        <Field label="Default rate" htmlFor="svc-price">
          <Input
            id="svc-price"
            type="number"
            min={0}
            step="500"
            className="w-36"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="12000"
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

function RemoveService({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Remove service"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteServiceItemAction(id);
          toast.success("Service removed");
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
    </Button>
  );
}
