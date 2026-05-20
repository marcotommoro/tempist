import { FontSizeToggle } from "./font-size-toggle";

export function FontSizeSection() {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Dimensione testo</h2>
        <p className="text-sm text-muted-foreground">
          Scala globale del testo. La preferenza è salvata per questo dispositivo.
        </p>
      </div>
      <div className="rounded-md border bg-card p-3">
        <FontSizeToggle />
      </div>
    </section>
  );
}
