"use client";

import { useState, useTransition } from "react";

import { EntityColorMarker } from "@/components/features/entity-color-marker";
import { setProjectColorAction } from "@/lib/actions/projects";
import { cn } from "@/lib/utils";

const COLOR_OPTIONS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
] as const;

export function ProjectColorSelect({
  projectId,
  initialColor,
  canEdit,
}: {
  projectId: string;
  initialColor: string;
  canEdit: boolean;
}) {
  const [color, setColor] = useState(initialColor);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSelect(next: string) {
    if (!canEdit || next === color) return;
    const previous = color;
    setColor(next);
    setError(null);
    startTransition(async () => {
      const res = await setProjectColorAction(projectId, next);
      if (!res.ok) {
        setError(res.error);
        setColor(previous);
      }
    });
  }

  if (!canEdit) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        Colore:
        <EntityColorMarker kind="project" color={color} />
      </span>
    );
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>Colore:</span>
      <span className="inline-flex flex-wrap items-center gap-1.5">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onSelect(c)}
            disabled={pending}
            aria-label={`Colore ${c}`}
            aria-pressed={color === c}
            className={cn(
              "h-5 w-5 rounded-full ring-2 ring-offset-1 ring-offset-background transition-all disabled:opacity-50",
              color === c
                ? "ring-foreground"
                : "ring-transparent hover:ring-foreground/30",
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </span>
      {error && <span className="text-destructive">{error}</span>}
    </div>
  );
}
