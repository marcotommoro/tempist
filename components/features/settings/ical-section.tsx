"use client";

import { useState, useTransition } from "react";
import { Copy, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createIcalTokenAction,
  revokeIcalTokenAction,
} from "@/lib/actions/ical";
import type { IcalToken } from "@/lib/db/schema";

export function IcalSection({
  tokens,
  baseUrl,
}: {
  tokens: IcalToken[];
  baseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function createNew() {
    setError(null);
    startTransition(async () => {
      const res = await createIcalTokenAction();
      if (!res.ok) setError(res.error);
    });
  }

  function revoke(tokenId: string) {
    setError(null);
    startTransition(async () => {
      const res = await revokeIcalTokenAction(tokenId);
      if (!res.ok) setError(res.error);
    });
  }

  function copyUrl(token: string, id: string) {
    const url = `${baseUrl}/api/ical/${token}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">iCal feed</h2>
        <p className="text-sm text-muted-foreground">
          URL pubblica per leggere i task come eventi calendario.
          Iscrivila al tuo calendario (Google, Apple, Outlook).
        </p>
      </div>

      <div className="rounded-md border bg-card p-3 space-y-3">
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun token generato.</p>
        ) : (
          <ul className="space-y-2">
            {tokens.map((t) => {
              const url = `${baseUrl}/api/ical/${t.token}`;
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <code className="flex-1 px-2 py-1 rounded bg-muted text-xs break-all">
                    {url}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyUrl(t.token, t.id)}
                    aria-label="Copia URL"
                    title="Copia URL"
                    className="p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="size-4" />
                  </button>
                  {copiedId === t.id && (
                    <span className="text-xs text-green-600">Copiato</span>
                  )}
                  <button
                    type="button"
                    onClick={() => revoke(t.id)}
                    disabled={pending}
                    aria-label="Revoca"
                    title="Revoca"
                    className="p-1.5 text-muted-foreground hover:text-destructive disabled:cursor-not-allowed"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <Button type="button" onClick={createNew} disabled={pending} size="sm">
          {pending ? "…" : "Genera nuovo token"}
        </Button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </section>
  );
}
