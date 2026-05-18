"use client";

import { Laptop, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme/theme-provider";
import { useIsClient } from "@/lib/hooks/use-is-client";

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <span
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground"
        aria-hidden
      />
    );
  }

  function cycle() {
    const next =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  }

  const Icon =
    theme === "system" ? Laptop : resolvedTheme === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Tema: ${theme}. Click per cambiare.`}
      title={`Tema: ${theme}`}
      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-[var(--dur-fast)] hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
    >
      <Icon className="size-4" />
    </button>
  );
}
