/**
 * UI state globale (Zustand).
 *
 * In Fase 0 questo store e' uno stub minimo. Verra popolato in Fase 1+ con:
 *   - sidebar collapsed
 *   - quick add modal open
 *   - timer state (Fase 2)
 *   - command palette open (Fase 6)
 */

import { create } from "zustand";

type UiState = {
  // Placeholder: serve a evitare 'empty interface' lint
  initialized: boolean;
  setInitialized: (v: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  initialized: false,
  setInitialized: (v) => set({ initialized: v }),
}));
