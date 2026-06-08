"use client";

import { useTransition } from "react";
import { Calendar, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  disconnectCalendarAccountAction,
  setCalendarPullEnabledAction,
} from "@/lib/actions/calendar";
import type { CalendarAccount } from "@/lib/db/schema";

export function CalendarSection({
  accounts,
  googleConfigured,
  flashMessage,
}: {
  accounts: CalendarAccount[];
  googleConfigured: boolean;
  flashMessage: { kind: "ok" | "err"; text: string } | null;
}) {
  const [pending, startTransition] = useTransition();

  function disconnect(accountId: string) {
    startTransition(async () => {
      await disconnectCalendarAccountAction(accountId);
    });
  }

  function togglePull(accountId: string, enabled: boolean) {
    startTransition(async () => {
      await setCalendarPullEnabledAction(accountId, enabled);
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Calendar sync</h2>
        <p className="text-sm text-muted-foreground">
          Sincronizzazione bidirezionale con il calendario principale Google:
          i task con data/ora diventano eventi e gli impegni con orario su
          Google compaiono in Inbox. Solo eventi con orario (no tutto il giorno).
          Aggiornamento in tempo reale se il webhook è raggiungibile, altrimenti
          entro circa 5 minuti. Puoi disattivare l’import degli appuntamenti dal
          calendario con l’interruttore qui sotto.
        </p>
      </div>

      {flashMessage && (
        <div
          className={
            flashMessage.kind === "ok"
              ? "text-xs text-green-600"
              : "text-xs text-red-500"
          }
        >
          {flashMessage.text}
        </div>
      )}

      <div className="rounded-md border bg-card p-3 space-y-3">
        {!googleConfigured && (
          <p className="text-xs text-amber-600">
            ⚠ <code>GOOGLE_CLIENT_ID</code> / <code>GOOGLE_CLIENT_SECRET</code>{" "}
            non configurati. Il pulsante <em>Connect</em> non funzionerà fino al
            setup.
          </p>
        )}

        {accounts.length === 0 ? (
          <div className="flex items-center gap-2">
            <Button asChild size="sm" disabled={!googleConfigured}>
              <a href="/api/integrations/google-calendar/connect">
                <Calendar className="size-4 mr-1" />
                Connetti Google Calendar
              </a>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {accounts.map((a) => (
              <li key={a.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{a.provider}</span>{" "}
                    <span className="text-muted-foreground text-xs">
                      {a.externalAccountId.slice(0, 12)}…
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => disconnect(a.id)}
                    disabled={pending}
                    aria-label="Disconnetti"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive disabled:cursor-not-allowed"
                  >
                    <X className="size-3.5" /> Disconnetti
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">
                      Importa appuntamenti dal calendario
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Gli eventi con orario segnati manualmente su Google
                      compaiono come task in Inbox. Disattivandolo fermi i
                      prossimi import; i task già importati restano.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={a.pullEnabled}
                    aria-label="Importa appuntamenti dal calendario"
                    onClick={() => togglePull(a.id, !a.pullEnabled)}
                    disabled={pending}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      a.pullEnabled ? "bg-primary" : "bg-input"
                    }`}
                  >
                    <span
                      className={`inline-block size-4 rounded-full bg-background shadow transition-transform ${
                        a.pullEnabled ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
