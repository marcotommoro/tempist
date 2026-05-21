import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[0.6875em] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "border-border bg-transparent text-foreground",
        muted:
          "border-border bg-muted/60 text-muted-foreground",
        coral:
          "border-transparent bg-coral/12 text-coral",
        sage:
          "border-transparent bg-sage/15 text-sage",
        billable:
          "border-transparent bg-billable-soft text-billable",
        info:
          "border-transparent bg-info/12 text-info",
        amber:
          "border-transparent bg-amber/15 text-amber",
        mono:
          "rounded-sm border-border bg-transparent font-mono tabular-nums text-[0.625em] uppercase tracking-[0.1em] text-muted-foreground px-1.5",
        chip:
          "rounded-md border-border bg-transparent font-mono text-[0.625em] uppercase tracking-[0.1em] text-ink-2 px-2.5 py-1 transition-colors hover:bg-accent",
        chipActive:
          "rounded-md border-foreground bg-foreground font-mono text-[0.625em] uppercase tracking-[0.1em] text-background px-2.5 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
