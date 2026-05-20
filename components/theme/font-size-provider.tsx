"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type FontSize = "sm" | "md" | "lg" | "xl" | "xxl";

const STORAGE_KEY = "font-size";
const DEFAULT: FontSize = "md";

interface FontSizeContextValue {
  fontSize: FontSize;
  setFontSize: (next: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextValue | null>(null);

function isFontSize(v: unknown): v is FontSize {
  return v === "sm" || v === "md" || v === "lg" || v === "xl" || v === "xxl";
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}
function emit() {
  for (const cb of listeners) cb();
}
function getSnapshot(): FontSize {
  if (typeof window === "undefined") return DEFAULT;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return isFontSize(v) ? v : DEFAULT;
}
const getServerSnapshot = (): FontSize => DEFAULT;

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const fontSize = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Mirror onto <html data-font-size>. The bootstrap script already sets this
  // before hydration; this effect keeps it in sync on subsequent changes.
  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", fontSize);
  }, [fontSize]);

  const setFontSize = useCallback((next: FontSize) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    emit();
  }, []);

  const value = useMemo(() => ({ fontSize, setFontSize }), [fontSize, setFontSize]);

  return <FontSizeContext.Provider value={value}>{children}</FontSizeContext.Provider>;
}

export function useFontSize() {
  const ctx = useContext(FontSizeContext);
  if (!ctx) {
    return { fontSize: DEFAULT, setFontSize: () => {} } satisfies FontSizeContextValue;
  }
  return ctx;
}
