"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { useIsClient } from "@/lib/hooks/use-is-client";

const OPTIONS = [
  { value: "light", label: "Chiaro", icon: Sun },
  { value: "system", label: "Sistema", icon: Laptop },
  { value: "dark", label: "Scuro", icon: Moon },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isClient = useIsClient();

  // Durante SSR/prima dell'hydration, mostriamo "system" come default neutro
  // per evitare hydration mismatch sui markers aria-checked.
  const current = isClient ? theme : "system";

  return (
    <div
      className="inline-flex rounded-md border bg-card p-0.5 text-xs"
      role="radiogroup"
      aria-label="Tema colori"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={current === value}
          onClick={() => setTheme(value)}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded transition-colors",
            current === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
