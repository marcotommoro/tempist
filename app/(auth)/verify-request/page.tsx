import { MailCheck } from "lucide-react";

export default function VerifyRequestPage() {
  return (
    <div className="rounded-lg border border-border bg-card/80 p-8 text-center shadow-sm backdrop-blur-sm">
      <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-coral/10 text-coral">
        <MailCheck className="h-5 w-5" />
      </div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Magic link sent
      </p>
      <h1 className="mb-3 font-display text-3xl leading-[1.1] tracking-tight text-foreground">
        Check your <span className="italic text-muted-foreground/90">inbox.</span>
      </h1>
      <p className="mb-2 text-[13px] text-muted-foreground">
        Ti abbiamo inviato un magic link per accedere. Cliccalo entro 5 minuti.
      </p>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
        Dev mode · link in server console
      </p>
    </div>
  );
}
