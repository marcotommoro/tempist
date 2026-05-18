"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sendTestDigestAction } from "@/lib/actions/digest";

export function DigestSection({ userEmail }: { userEmail: string }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function sendTest() {
    setError(null);
    setStatus("idle");
    startTransition(async () => {
      const res = await sendTestDigestAction();
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
        <h2 className="text-base font-semibold">Daily digest</h2>
        <p className="text-sm text-muted-foreground">
          Ogni mattina alle 08:00 (nella tua timezone) ricevi un riepilogo via
          email a <code className="text-xs">{userEmail}</code>: task di oggi,
          promemoria, ore tracciate ieri.
        </p>
      </div>
      <div className="rounded-md border bg-card p-3 flex items-center gap-3">
        <Button type="button" onClick={sendTest} disabled={pending} size="sm">
          <Mail className="size-4 mr-1" />
          {pending ? "Invio…" : "Invia digest di prova ora"}
        </Button>
        {status === "sent" && (
          <span className="text-xs text-green-600">
            Digest inviato (controlla la console in dev se RESEND_API_KEY non è settata).
          </span>
        )}
        {status === "error" && error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
      </div>
    </section>
  );
}
