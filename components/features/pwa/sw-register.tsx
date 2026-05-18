"use client";

import { useEffect } from "react";

/**
 * Registra il service worker /sw.js solo in produzione.
 * In dev evitiamo cache aggressive che renderebbero painful l'iterazione.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[sw] registrazione fallita", err);
    });
  }, []);

  return null;
}
