"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { createClientAction } from "@/lib/actions/clients";

const COLOR_OPTIONS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"];

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
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border bg-card p-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome *">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            maxLength={120}
            className="input"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            placeholder="billing@..."
            className="input"
          />
        </Field>
        <Field label="Tariffa oraria default">
          <input
            type="text"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            disabled={pending}
            placeholder="80.00"
            className="input"
          />
        </Field>
        <Field label="Valuta">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={pending}
            className="input"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="CHF">CHF</option>
          </select>
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Colore:</span>
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Colore ${c}`}
            className={`w-5 h-5 rounded-full border-2 ${
              color === c ? "border-foreground" : "border-transparent"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="size-4" />
          Crea cliente
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
