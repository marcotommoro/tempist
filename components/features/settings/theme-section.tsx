import { ThemeToggle } from "./theme-toggle";

export function ThemeSection() {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Aspetto</h2>
        <p className="text-sm text-muted-foreground">
          Schema colori. <em>Sistema</em> segue le preferenze del tuo OS.
        </p>
      </div>
      <div className="rounded-md border bg-card p-3">
        <ThemeToggle />
      </div>
    </section>
  );
}
