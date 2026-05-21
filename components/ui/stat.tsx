import * as React from "react"

import { cn } from "@/lib/utils"

interface StatProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  label: React.ReactNode
  value: React.ReactNode
  sub?: React.ReactNode
  accent?: "coral" | "billable"
}

/** KPI cell: mono eyebrow label + large tabular value + optional sub.
 *  Compose several inside a <Card className="flex divide-x divide-border"> for a KPI row. */
function Stat({ label, value, sub, accent, className, ...props }: StatProps) {
  return (
    <div className={cn("flex flex-1 flex-col gap-1.5 px-5 py-4", className)} {...props}>
      <span className="text-meta">{label}</span>
      <span
        className={cn(
          "font-mono text-3xl font-medium tracking-[-0.02em] tabular-nums",
          accent === "coral" && "text-coral",
          accent === "billable" && "text-billable",
        )}
      >
        {value}
      </span>
      {sub != null && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}

export { Stat }
