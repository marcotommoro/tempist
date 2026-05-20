"use client";

import { useState, useTransition, type KeyboardEvent } from "react";

import { renameProjectAction } from "@/lib/actions/projects";
import { cn } from "@/lib/utils";

export function ProjectEditableTitle({
  projectId,
  initialName,
  canEdit,
}: {
  projectId: string;
  initialName: string;
  canEdit: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function startEdit() {
    if (!canEdit) return;
    setDraft(name);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setDraft(name);
    setError(null);
    setEditing(false);
  }

  function save(raw: string) {
    const next = raw.trim();
    if (!next) {
      setError("Nome vuoto");
      setDraft(name);
      return;
    }
    if (next === name) {
      setEditing(false);
      setError(null);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await renameProjectAction(projectId, next);
      if (!res.ok) {
        setError(res.error);
        setDraft(name);
        return;
      }
      setName(next);
      setDraft(next);
      setEditing(false);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      save(draft);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
      (e.target as HTMLInputElement).blur();
    }
  }

  if (editing) {
    return (
      <span className="block min-w-0">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => save(draft)}
          onKeyDown={onKeyDown}
          disabled={pending}
          maxLength={80}
          autoFocus
          aria-label="Nome progetto"
          className={cn(
            "w-full min-w-0 border-0 border-b border-border bg-transparent p-0",
            "page-title text-foreground",
            "outline-none focus:border-foreground/30 focus:ring-0",
            "disabled:opacity-50",
          )}
        />
        {error ? (
          <span className="mt-1 block font-sans text-[0.75rem] normal-case tracking-normal text-destructive">
            {error}
          </span>
        ) : null}
      </span>
    );
  }

  if (!canEdit) {
    return <span>{name}</span>;
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className={cn(
        "block max-w-full cursor-pointer text-left",
        "rounded-sm transition-colors hover:opacity-80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
      aria-label="Rinomina progetto"
    >
      {name}
    </button>
  );
}
