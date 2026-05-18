"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { createFilterAction } from "@/lib/actions/filters";

export function CreateFilterForm() {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !query.trim()) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name.trim());
      fd.set("queryDsl", query.trim());
      const res = await createFilterAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setName("");
      setQuery("");
      nameRef.current?.focus();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border bg-card p-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Nome filtro
        </label>
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
          placeholder='Es: "Urgenti settimana"'
          maxLength={80}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Query DSL
        </label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={pending}
          placeholder="priority:P1 @urgent due:7d is:open"
          maxLength={500}
          autoComplete="off"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">
          Token: <code>priority:P1,P2</code> · <code>@labelName</code> · <code>due:today|overdue|7d|30d</code> · <code>is:open|completed</code> · <code>project:Nome</code> · <code>client:Nome</code> · testo libero
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !name.trim() || !query.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="size-4" />
          Salva filtro
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </form>
  );
}
