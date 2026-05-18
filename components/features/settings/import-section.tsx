"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  importCsvAction,
  type ImportResult,
} from "@/lib/actions/import";

export function ImportSection() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const res = await importCsvAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.data);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Importa CSV</h2>
        <p className="text-sm text-muted-foreground">
          Supportati: <strong>Todoist</strong> (task) e <strong>Toggl</strong>{" "}
          (time entries). Il formato viene riconosciuto automaticamente dalle
          colonne CSV.
        </p>
      </div>

      <div className="rounded-md border bg-card p-3 space-y-3">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          disabled={pending}
          className="hidden"
          id="import-csv-input"
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
          >
            <Upload className="size-4 mr-1" />
            {pending ? "Importazione…" : "Seleziona CSV"}
          </Button>
          <span className="text-xs text-muted-foreground">max 5MB</span>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {result && (
          <div className="text-xs space-y-1 border-t pt-3">
            <p>
              <strong>Source:</strong> {result.source}
            </p>
            <p>
              <strong>Inseriti:</strong> {result.inserted} ·{" "}
              <strong>Saltati:</strong> {result.skipped} ·{" "}
              <strong>Errori:</strong> {result.errors.length}
            </p>
            {result.errors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-muted-foreground">
                  Dettagli errori ({result.errors.length})
                </summary>
                <ul className="mt-1 space-y-0.5 pl-2 text-red-500">
                  {result.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>
                      riga {e.rowIndex + 2}: {e.message}
                    </li>
                  ))}
                  {result.errors.length > 20 && (
                    <li>… e altri {result.errors.length - 20}</li>
                  )}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
