"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { useIsClient } from "@/lib/hooks/use-is-client";

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <span
        className="inline-flex items-center justify-center size-9 rounded-md text-muted-foreground"
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
      className="inline-flex items-center justify-center size-9 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      <Icon className="size-4" />
    </button>
  );
}
