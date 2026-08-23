"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { submitProjectPinAction } from "@/lib/actions/portal-auth";

/** Shown instead of the project when a PIN is set and not yet cleared. */
export function PinGate({ token, studioName }: { token: string; studioName: string }) {
  const router = useRouter();
  const [pin, setPin] = React.useState("");
  const [pending, start] = React.useTransition();

  function submit() {
    start(async () => {
      const result = await submitProjectPinAction(token, pin);
      if (result?.error) {
        toast.error(result.error);
        setPin("");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm p-8 text-center">
        <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Camera className="size-5" />
        </span>

        <h1 className="mt-4 text-lg font-semibold tracking-tight">{studioName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the 4-digit PIN your studio shared with you.
        </p>

        <Input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          onKeyDown={(e) => e.key === "Enter" && pin.length === 4 && submit()}
          inputMode="numeric"
          autoFocus
          placeholder="0000"
          className="mx-auto mt-6 h-12 w-40 text-center text-2xl tracking-[0.5em]"
        />

        <Button
          className="mt-4 w-full"
          size="lg"
          onClick={submit}
          disabled={pending || pin.length !== 4}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Lock />}
          Open project
        </Button>
      </Card>
    </div>
  );
}
