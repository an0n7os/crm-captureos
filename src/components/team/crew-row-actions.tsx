"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CrewDialog, type CrewValues } from "@/components/team/crew-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteCrewAction, toggleCrewActiveAction } from "@/lib/actions/crew-actions";

export function CrewRowActions({ crew, isActive }: { crew: CrewValues; isActive: boolean }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [, start] = React.useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Team member actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() =>
              start(async () => {
                const result = await toggleCrewActiveAction(crew.id);
                if (!result?.ok) {
                  toast.error(result?.error ?? "Could not update");
                  return;
                }
                toast.success(isActive ? "Marked inactive" : "Marked active");
                router.refresh();
              })
            }
          >
            <Power />
            {isActive ? "Mark inactive" : "Mark active"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="danger"
            onSelect={() =>
              start(async () => {
                await deleteCrewAction(crew.id);
                toast.success(`${crew.name} removed`);
                router.refresh();
              })
            }
          >
            <Trash2 />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Controlled from here so closing the menu does not unmount the dialog. */}
      <CrewDialog crew={crew} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
