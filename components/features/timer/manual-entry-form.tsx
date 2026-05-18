"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { format } from "date-fns";

import { createManualEntryAction } from "@/lib/actions/timer";

/**
 * Manual entry — voce di tracking retroattiva.
 * datetime-local inputs lavorano in tz locale del browser: lo standard JS converte
 * automaticamente in UTC quando chiamiamo new Date(value), il server riceve istanti UTC.
 */
export function ManualEntryForm({ clientId }: { clientId?: string }) {
  const now = new Date();
  const defaultStart = format(
    new Date(now.getTime() - 60 * 60 * 1000),
    "yyyy-MM-dd'T'HH:mm",
  );
  const defaultEnd = format(now, "yyyy-MM-dd'T'HH:mm");

  const [open, setOpen] = useState(false);
  const [startedAt, setStartedAt] = useState(defaultStart);
  const [endedAt, setEndedAt] = useState(defaultEnd);
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createManualEntryAction({
        startedAt: new Date(startedAt).toISOString(),
        endedAt: new Date(endedAt).toISOString(),
        description: description.trim() || undefined,
        clientId: clientId ?? null,
        isBillable: billable,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDescription("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
      >
        <Plus className="size-3.5" /> Aggiungi voce manuale
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border bg-card p-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Inizio">
          <input
            type="datetime-local"
            required
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
            disabled={pending}
            className="input"
          />
        </Field>
        <Field label="Fine">
          <input
            type="datetime-local"
            required
            value={endedAt}
            onChange={(e) => setEndedAt(e.target.value)}
            disabled={pending}
            className="input"
          />
        </Field>
      </div>
      <Field label="Descrizione (opzionale)">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={pending}
          placeholder="Cosa hai fatto?"
          maxLength={500}
          className="input"
        />
      </Field>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={billable}
          onChange={(e) => setBillable(e.target.checked)}
          disabled={pending}
        />
        <span>Fatturabile</span>
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Salva voce
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Annulla
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <style>{`
        .input {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid hsl(var(--input));
          background: hsl(var(--background));
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .input:focus { outline: 2px solid hsl(var(--ring)); outline-offset: -1px; }
        .input:disabled { opacity: 0.5; }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
