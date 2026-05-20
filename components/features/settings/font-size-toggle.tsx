"use client";

import { useFontSize, type FontSize } from "@/components/theme/font-size-provider";
import { cn } from "@/lib/utils";
import { useIsClient } from "@/lib/hooks/use-is-client";

// Preview "Aa" è renderizzata a dimensione assoluta (px), non scalata dal setting
// utente — così il toggle mostra sempre la scala relativa reale tra le opzioni.
const OPTIONS = [
  { value: "sm", label: "sm", previewPx: 11 },
  { value: "md", label: "md", previewPx: 13 },
  { value: "lg", label: "lg", previewPx: 15 },
  { value: "xl", label: "xl", previewPx: 17 },
  { value: "xxl", label: "xxl", previewPx: 19 },
] as const satisfies ReadonlyArray<{ value: FontSize; label: string; previewPx: number }>;

export function FontSizeToggle() {
  const { fontSize, setFontSize } = useFontSize();
  const isClient = useIsClient();

  // Pre-hydration: mostra "md" per evitare hydration mismatch sui marker aria-checked.
  const current: FontSize = isClient ? fontSize : "md";

  return (
    <div
      className="inline-flex items-end gap-0.5 rounded-md border bg-card p-1"
      role="radiogroup"
      aria-label="Dimensione testo"
    >
      {OPTIONS.map(({ value, label, previewPx }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={current === value}
          aria-label={`Dimensione ${label}`}
          onClick={() => setFontSize(value)}
          className={cn(
            "inline-flex w-12 flex-col items-center justify-end gap-0.5 rounded px-1.5 py-1 transition-colors",
            current === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <span
            aria-hidden
            className="font-display leading-none"
            style={{ fontSize: `${previewPx}px` }}
          >
            Aa
          </span>
          <span className="font-mono text-[0.5625rem] uppercase tracking-[0.14em] leading-none">
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
