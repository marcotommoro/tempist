"use client";

import { useState, useTransition } from "react";
import { BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sendTestWeeklyReportAction } from "@/lib/actions/weekly-report";

export function WeeklyReportSection() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function sendTest() {
    setError(null);
    setStatus("idle");
    startTransition(async () => {
      const res = await sendTestWeeklyReportAction();
      if (!res.ok) {
        setError(res.error);
        setStatus("error");
        return;
      }
      setStatus("sent");
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Report settimanale</h2>
        <p className="text-sm text-muted-foreground">
          Ogni lunedì alle 08:00 (tua tz) ricevi il report della settimana
          precedente: ore per cliente, task completati, fatturabile.
        </p>
      </div>
      <div className="rounded-md border bg-card p-3 flex items-center gap-3">
        <Button type="button" onClick={sendTest} disabled={pending} size="sm">
          <BarChart3 className="size-4 mr-1" />
          {pending ? "Invio…" : "Invia report di prova ora"}
        </Button>
        {status === "sent" && (
          <span className="text-xs text-green-600">
            Report inviato (controlla la console in dev se RESEND_API_KEY non è settata).
          </span>
        )}
        {status === "error" && error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
      </div>
    </section>
  );
}
