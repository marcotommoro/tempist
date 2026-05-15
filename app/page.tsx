import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight">Todoist + Time Tracker</h1>
        <p className="text-muted-foreground">
          Task management e time tracking, integrati. (Fase 0 — landing minimale)
        </p>
        <Link
          href="/sign-in"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Accedi
        </Link>
      </div>
    </main>
  );
}
