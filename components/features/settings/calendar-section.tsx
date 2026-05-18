"use client";

import { useTransition } from "react";
import { Calendar, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { disconnectCalendarAccountAction } from "@/lib/actions/calendar";
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

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Calendar sync</h2>
        <p className="text-sm text-muted-foreground">
          Push automatico dei task come eventi su Google Calendar.
          Push-only: gli eventi creati direttamente su Google non vengono
          importati come task.
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
          <ul className="space-y-2">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
