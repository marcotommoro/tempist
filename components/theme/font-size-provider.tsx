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

const STORAGE_KEY_CHROME = "font-size";
const STORAGE_KEY_CONTENT = "content-font-size";
const DEFAULT: FontSize = "md";

interface FontSizeContextValue {
  chromeFontSize: FontSize;
  contentFontSize: FontSize;
  setChromeFontSize: (next: FontSize) => void;
  setContentFontSize: (next: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextValue | null>(null);

function isFontSize(v: unknown): v is FontSize {
  return v === "sm" || v === "md" || v === "lg" || v === "xl" || v === "xxl";
}

// One independent pub/sub per key — keeps subscribers from re-rendering on the
// other axis change. StorageEvent fires across tabs for free.
function makeStore(key: string) {
  const listeners = new Set<() => void>();
  return {
    subscribe(cb: () => void) {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) cb();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    emit() {
      for (const cb of listeners) cb();
    },
    snapshot(): FontSize {
      if (typeof window === "undefined") return DEFAULT;
      const v = window.localStorage.getItem(key);
      return isFontSize(v) ? v : DEFAULT;
    },
    serverSnapshot(): FontSize {
      return DEFAULT;
    },
    write(next: FontSize) {
      window.localStorage.setItem(key, next);
    },
  };
}

const chromeStore = makeStore(STORAGE_KEY_CHROME);
const contentStore = makeStore(STORAGE_KEY_CONTENT);

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const chromeFontSize = useSyncExternalStore(
    chromeStore.subscribe,
    chromeStore.snapshot,
    chromeStore.serverSnapshot,
  );
  const contentFontSize = useSyncExternalStore(
    contentStore.subscribe,
    contentStore.snapshot,
    contentStore.serverSnapshot,
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", chromeFontSize);
  }, [chromeFontSize]);

  useEffect(() => {
    document.documentElement.setAttribute("data-content-size", contentFontSize);
  }, [contentFontSize]);

  const setChromeFontSize = useCallback((next: FontSize) => {
    chromeStore.write(next);
    chromeStore.emit();
  }, []);

  const setContentFontSize = useCallback((next: FontSize) => {
    contentStore.write(next);
    contentStore.emit();
  }, []);

  const value = useMemo(
    () => ({ chromeFontSize, contentFontSize, setChromeFontSize, setContentFontSize }),
    [chromeFontSize, contentFontSize, setChromeFontSize, setContentFontSize],
  );

  return <FontSizeContext.Provider value={value}>{children}</FontSizeContext.Provider>;
}

export function useFontSize() {
  const ctx = useContext(FontSizeContext);
  if (!ctx) {
    return {
      chromeFontSize: DEFAULT,
      contentFontSize: DEFAULT,
      setChromeFontSize: () => {},
      setContentFontSize: () => {},
    } satisfies FontSizeContextValue;
  }
  return ctx;
}
