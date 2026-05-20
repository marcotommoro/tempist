"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackURL = params.get("redirectTo") ?? "/today";

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authClient.signIn.magicLink({ email, callbackURL });
      if (res.error) {
        setError(res.error.message ?? "Errore invio magic link");
        return;
      }
      router.push("/verify-request");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSocial(provider: "google" | "github") {
    setError(null);
    setSubmitting(true);
    try {
      await authClient.signIn.social({ provider, callbackURL });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card/80 p-8 shadow-sm backdrop-blur-sm">
      <div className="mb-6 space-y-2">
        <p className="font-mono text-[0.625em] uppercase tracking-[0.18em] text-muted-foreground">
          Sign in
        </p>
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-foreground">
          Welcome <span className="italic text-muted-foreground/90">back.</span>
        </h1>
        <p className="text-[0.8125em] text-muted-foreground">
          Inserisci la tua email per ricevere il magic link.
        </p>
      </div>

      <form onSubmit={handleMagicLink} className="space-y-3">
        <input
          type="email"
          required
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors hover:border-foreground/20 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-md bg-foreground px-3 py-2.5 font-mono text-[0.6875em] uppercase tracking-wider text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send magic link"}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-3 font-mono text-[0.625em] uppercase tracking-[0.18em] text-muted-foreground">
            or
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleSocial("google")}
          className="inline-flex w-full items-center justify-center rounded-md border border-border bg-transparent px-3 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-50"
        >
          Continue with Google
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleSocial("github")}
          className="inline-flex w-full items-center justify-center rounded-md border border-border bg-transparent px-3 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-50"
        >
          Continue with GitHub
        </button>
      </div>

      {error && (
        <p className="mt-4 font-mono text-[0.6875em] text-destructive">{error}</p>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <p className="text-center font-display text-base italic text-muted-foreground">
          Loading…
        </p>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
