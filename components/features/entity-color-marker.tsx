import { Building2 } from "lucide-react";

import { cn } from "@/lib/utils";

type EntityColorMarkerProps = {
  kind: "project" | "client";
  color: string;
  size?: "sm" | "md";
  className?: string;
};

const dotSize = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
} as const;

const iconSize = {
  sm: "size-2",
  md: "size-2.5",
} as const;

export function EntityColorMarker({
  kind,
  color,
  size = "md",
  className,
}: EntityColorMarkerProps) {
  if (kind === "client") {
    return (
      <Building2
        className={cn("shrink-0", iconSize[size], className)}
        style={{ color }}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={cn(
        "shrink-0 rounded-full ring-1 ring-inset ring-black/10",
        dotSize[size],
        className,
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}
