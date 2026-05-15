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
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Accedi</h1>
        <p className="text-sm text-neutral-500">Inserisci la tua email per ricevere il magic link.</p>
      </header>

      <form onSubmit={handleMagicLink} className="space-y-3">
        <input
          type="email"
          required
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:bg-neutral-900 dark:border-neutral-700"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {submitting ? "Invio in corso..." : "Invia magic link"}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-neutral-50 dark:bg-neutral-950 px-2 text-neutral-500">oppure</span>
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleSocial("google")}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 dark:bg-neutral-900 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Continua con Google
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleSocial("github")}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 dark:bg-neutral-900 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Continua con GitHub
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="text-sm text-neutral-500">Caricamento...</div>}>
      <SignInForm />
    </Suspense>
  );
}
