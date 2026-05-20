"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { createClientAction } from "@/lib/actions/clients";
import { cn } from "@/lib/utils";

const COLOR_OPTIONS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

export function CreateClientForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rate, setRate] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [color, setColor] = useState("#3b82f6");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name.trim());
      fd.set("email", email.trim());
      fd.set("hourlyRateDefault", rate.trim());
      fd.set("currency", currency);
      fd.set("color", color);
      const res = await createClientAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setName("");
      setEmail("");
      setRate("");
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-md border border-border bg-card/40 p-5"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name *">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            maxLength={120}
            className="editorial-input"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            placeholder="billing@…"
            className="editorial-input"
          />
        </Field>
        <Field label="Default rate (per hour)">
          <input
            type="text"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            disabled={pending}
            placeholder="80.00"
            className="editorial-input font-mono tabular-nums"
          />
        </Field>
        <Field label="Currency">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={pending}
            className="editorial-input"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="CHF">CHF</option>
          </select>
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[0.625em] uppercase tracking-[0.14em] text-muted-foreground">
          Color
        </span>
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Colore ${c}`}
            className={cn(
              "h-5 w-5 rounded-full ring-2 ring-offset-1 ring-offset-card transition-all",
              color === c
                ? "ring-foreground"
                : "ring-transparent hover:ring-foreground/30",
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-2 font-mono text-[0.6875em] uppercase tracking-wider text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="size-3.5" />
          Create client
        </button>
        {error && (
          <p className="font-mono text-[0.6875em] text-destructive">{error}</p>
        )}
      </div>
      <style>{`
        .editorial-input {
          width: 100%;
          border-radius: 6px;
          border: 1px solid var(--input);
          background: var(--background);
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
          transition: border-color 140ms;
        }
        .editorial-input:hover { border-color: color-mix(in oklch, var(--foreground) 20%, transparent); }
        .editorial-input:focus { outline: 2px solid var(--ring); outline-offset: 1px; }
        .editorial-input:disabled { opacity: 0.5; }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="font-mono text-[0.625em] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
