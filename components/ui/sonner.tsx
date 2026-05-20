"use client"

import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react"
import { Toaster as Sonner } from "sonner"

import { useTheme } from "@/components/theme/theme-provider"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      expand={false}
      closeButton
      offset={20}
      icons={{
        success: <CircleCheck className="h-3.5 w-3.5 text-sage" />,
        info: <Info className="h-3.5 w-3.5" />,
        warning: <TriangleAlert className="h-3.5 w-3.5" />,
        error: <OctagonX className="h-3.5 w-3.5 text-destructive" />,
        loading: <LoaderCircle className="h-3.5 w-3.5 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-md group-[.toaster]:rounded-md group-[.toaster]:px-3.5 group-[.toaster]:py-2.5 group-[.toaster]:text-[0.8125em]",
          title: "group-[.toast]:font-medium group-[.toast]:text-[0.8125em]",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-[0.75em]",
          actionButton:
            "group-[.toast]:font-mono group-[.toast]:text-[0.6875em] group-[.toast]:uppercase group-[.toast]:tracking-wider group-[.toast]:bg-coral group-[.toast]:text-coral-foreground group-[.toast]:rounded group-[.toast]:px-2 group-[.toast]:py-1",
          cancelButton:
            "group-[.toast]:font-mono group-[.toast]:text-[0.6875em] group-[.toast]:uppercase group-[.toast]:tracking-wider group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:border-border group-[.toast]:bg-card group-[.toast]:text-muted-foreground hover:group-[.toast]:bg-accent",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
