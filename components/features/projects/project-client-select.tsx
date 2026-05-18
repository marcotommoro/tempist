"use client";

import { useState, useTransition } from "react";

import { setProjectClientAction } from "@/lib/actions/projects";
import type { Client } from "@/lib/db/schema";

export function ProjectClientSelect({
  projectId,
  currentClientId,
  clients,
}: {
  projectId: string;
  currentClientId: string | null;
  clients: Pick<Client, "id" | "name" | "color">[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState<string>(currentClientId ?? "");

  function onChange(next: string) {
    setValue(next);
    setError(null);
    startTransition(async () => {
      const res = await setProjectClientAction(
        projectId,
        next === "" ? null : next,
      );
      if (!res.ok) setError(res.error);
    });
  }

  const current = clients.find((c) => c.id === value);

  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      Cliente:
      <span className="inline-flex items-center gap-1.5">
        {current && (
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: current.color }}
            aria-hidden
          />
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
      </span>
      {error && <span className="text-destructive">{error}</span>}
    </label>
  );
}
