"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { createSectionAction } from "@/lib/actions/projects";

export function CreateSectionForm({ projectId }: { projectId: string }) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", trimmed);
      const res = await createSectionAction(projectId, fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setName("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-input px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
      >
        <Plus className="size-3.5" /> Nuova sezione
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (!name.trim() && !pending) setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setName("");
          }
        }}
        disabled={pending}
        placeholder="Nome sezione..."
        autoComplete="off"
        maxLength={80}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={pending || !name.trim()}
        className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        Aggiungi
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </form>
  );
}
