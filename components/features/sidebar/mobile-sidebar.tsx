"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Drawer di navigazione mobile: visibile solo sotto lg, riusa il contenuto
 * della sidebar (server component) passato come children.
 */
export function MobileSidebar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="-ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        aria-label="Apri menu di navigazione"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </SheetTrigger>
      {/* [&>button]:hidden nasconde la X built-in dello Sheet, che si
          sovrapporrebbe al WorkspaceSwitcher; Esc e overlay restano attivi. */}
      <SheetContent
        side="left"
        className="flex w-[280px] flex-col gap-0 bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">Menu di navigazione</SheetTitle>
        {/* Delegation: chiude il drawer quando il click attraversa un link.
            I link sono server component, non possono chiudere da soli; questo
            evita anche il pattern setState-in-effect su pathname. */}
        <div
          className="flex min-h-0 flex-1 flex-col"
          onClickCapture={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
