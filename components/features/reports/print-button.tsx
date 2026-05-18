"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="mt-2 text-xs px-2 py-1 rounded border bg-card hover:bg-muted"
    >
      Stampa / Salva come PDF (Cmd+P)
    </button>
  );
}
