"use client";

import { useFontSize } from "@/components/theme/font-size-provider";
import { FontSizeToggle } from "./font-size-toggle";

export function FontSizeSection() {
  const {
    chromeFontSize,
    contentFontSize,
    setChromeFontSize,
    setContentFontSize,
  } = useFontSize();

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Dimensione testo</h2>
        <p className="text-sm text-muted-foreground">
          Due assi indipendenti. Le preferenze sono salvate per questo dispositivo.
        </p>
      </div>
      <div className="space-y-3 rounded-md border bg-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Contenuto</div>
            <p className="text-xs text-muted-foreground">
              Area principale (task, progetti, report, timesheet).
            </p>
          </div>
          <FontSizeToggle
            value={contentFontSize}
            onChange={setContentFontSize}
            ariaLabel="Dimensione testo contenuto"
          />
        </div>
        <div className="h-px bg-border" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Interfaccia</div>
            <p className="text-xs text-muted-foreground">
              Sidebar, topbar, dialoghi, command palette.
            </p>
          </div>
          <FontSizeToggle
            value={chromeFontSize}
            onChange={setChromeFontSize}
            ariaLabel="Dimensione testo interfaccia"
          />
        </div>
      </div>
    </section>
  );
}
