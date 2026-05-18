"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { createProjectAction } from "@/lib/actions/projects";
import type { Client } from "@/lib/db/schema";

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

export function CreateProjectForm({
  clients = [],
}: {
  clients?: Pick<Client, "id" | "name">[];
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[5] ?? "#3b82f6");
  const [clientId, setClientId] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", trimmed);
      fd.set("color", color);
      if (clientId) fd.set("clientId", clientId);
      const res = await createProjectAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setName("");
      setClientId("");
      inputRef.current?.focus();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
          placeholder="Nome nuovo progetto..."
          autoComplete="off"
          maxLength={80}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="size-4" />
          Crea
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
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
        {clients.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Cliente:
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={pending}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
            >
              <option value="">— nessuno —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
