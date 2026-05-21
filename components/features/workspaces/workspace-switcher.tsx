"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Settings } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchWorkspaceAction } from "@/lib/actions/workspaces";
import type { MyWorkspace } from "@/lib/domain/workspaces";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";

export function WorkspaceSwitcher({
  workspaces,
  activeId,
}: {
  workspaces: MyWorkspace[];
  activeId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  const active = workspaces.find((w) => w.id === activeId);

  function switchTo(id: string) {
    if (id === activeId) return;
    startTransition(async () => {
      const res = await switchWorkspaceAction(id);
      if (res.ok) router.refresh();
    });
  }

  const initial = (active?.name ?? "?").slice(0, 1).toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={pending}
            className="group flex h-14 w-full shrink-0 items-center gap-2.5 border-b border-sidebar-border px-3.5 transition-colors hover:bg-sidebar-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:opacity-50"
            aria-label="Cambia workspace"
          >
            <span
              aria-hidden
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-foreground font-serif text-[1.0625em] leading-none italic text-background"
            >
              {initial}
            </span>
            <div className="flex min-w-0 flex-1 flex-col text-left">
              <span className="truncate font-display text-[0.9375em] leading-none text-foreground">
                {active?.name ?? "Seleziona workspace"}
              </span>
              <span className="mt-0.5 truncate font-mono text-[0.625em] uppercase tracking-[0.14em] text-muted-foreground">
                {active?.role ?? "—"}
                {active?.slug ? ` · ${active.slug}` : ""}
              </span>
            </div>
            <ChevronsUpDown
              className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground"
              aria-hidden
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="bottom" sideOffset={4} className="w-[244px]">
          <DropdownMenuLabel>Workspace</DropdownMenuLabel>
          {workspaces.map((w) => (
            <DropdownMenuItem
              key={w.id}
              onSelect={() => switchTo(w.id)}
              className="flex items-center gap-2"
            >
              <span
                aria-hidden
                className="grid h-5 w-5 shrink-0 place-items-center rounded bg-foreground/10 font-mono text-[0.5625em] uppercase text-foreground"
              >
                {w.name.slice(0, 1)}
              </span>
              <span className="flex-1 truncate">{w.name}</span>
              {w.id === activeId && <Check className="size-3.5" aria-hidden />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setCreateOpen(true);
            }}
          >
            <Plus />
            Crea workspace
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/settings/workspace")}>
            <Settings />
            Gestisci workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
