"use client";

import { useSyncExternalStore } from "react";

/**
 * Ritorna true dopo l'hydration lato client, false durante SSR.
 * Sostituisce il pattern `useState(false) + useEffect(() => setMounted(true), [])`
 * (che la nuova regola eslint `react-hooks/set-state-in-effect` blocca).
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
