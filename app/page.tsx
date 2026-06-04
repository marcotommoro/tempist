import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Pause, Plus, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

const GITHUB_REPO = "https://github.com/marcotommoro/tempist";
const SELF_HOST_DOC = `${GITHUB_REPO}/blob/main/docs/deployment/coolify.md`;

export const metadata: Metadata = {
  title: "Tempist — the hours you actually billed",
  description:
    "Un time tracker per freelance e piccoli studi. Scrivi cosa hai fatto, premi invio, manda la fattura.",
};

const navLinks = ["Product", "For freelancers", "Pricing", "Changelog"];

const features = [
  {
    n: "01",
    t: "One-line time entry",
    d: "Scrivi 'Call Mario 15:00 #demo 60min' e pensiamo noi a progetto, data, durata e fatturabilità. Niente form.",
    color: "text-coral",
  },
  {
    n: "02",
    t: "Invoice-ready exports",
    d: "CSV, PDF stampabile o direttamente su Fattura24. Ore riconciliate al minuto, fatturabile separato dall'interno.",
    color: "text-billable",
  },
  {
    n: "03",
    t: "Pulse, not surveillance",
    d: "Il ritmo della settimana a colpo d'occhio. Dove va il tempo, chi ti deve pagare, cosa sta slittando. Senza teatrini di controllo.",
    color: "text-info",
  },
];

const parseTokens: Array<[string, string, string]> = [
  ["#client", "Routes to client", "text-info"],
  ["p1, p2, p3", "Priority", "text-coral"],
  ["60min, 1h30, 2:00", "Duration", "text-billable"],
  ["tomorrow 15:00", "Smart dates", "text-ink-2"],
];

const plans = [
  {
    name: "Solo",
    price: "€0",
    ghostPrice: null as string | null,
    per: "forever",
    feats: ["Unlimited tracking", "Unlimited clients & projects", "CSV + PDF export", "2 years of history"],
    cta: "Start free",
    primary: false,
    badge: null as string | null,
  },
  {
    name: "Studio",
    price: "€0",
    ghostPrice: "€8",
    per: "anche con 10 persone in sala",
    feats: ["Everything in Solo", "Up to 10 teammates", "Invoicing integrations", "Team reports", "Priority email support"],
    cta: "Ancora gratis",
    primary: true,
    badge: "ANCORA €0",
  },
  {
    name: "Agency",
    price: "€0",
    ghostPrice: "€18",
    per: "anche se chiedi SAML per sport",
    feats: ["Everything in Studio", "SSO + SAML", "Custom rate tables", "API + webhooks", "Dedicated CSM"],
    cta: "Nessuna call commerciale",
    primary: false,
    badge: null,
  },
];

const weekBars = [2, 3, 4, 5, 6, 5.7, 0];
const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

function GitHubIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`grid place-items-center rounded-lg bg-foreground font-semibold leading-none text-background ${className}`}
    >
      T
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="flex-1 bg-background text-foreground">
      <nav className="flex items-center gap-4 border-b border-line-soft px-6 py-5 md:px-12">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="h-[30px] w-[30px] text-sm" />
          <span className="text-lg font-semibold tracking-[-0.02em]">Tempist</span>
        </Link>
        <div className="ml-10 hidden items-center gap-7 text-sm text-ink-2 lg:flex">
          {navLinks.map((l) => (
            <span key={l} className="cursor-default transition-colors hover:text-foreground">
              {l}
            </span>
          ))}
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <GitHubIcon className="size-3.5" />
            GitHub
          </a>
        </div>
        <div className="ml-auto flex items-center gap-3.5">
          <Link href="/sign-in" className="text-sm text-ink-2 transition-colors hover:text-foreground">
            Log in
          </Link>
          <Button asChild className="rounded-lg">
            <Link href="/sign-in">Start tracking — free</Link>
          </Button>
        </div>
      </nav>

      <section className="px-6 pb-20 pt-16 md:px-12 md:pt-24">
        <div className="mx-auto grid max-w-[1200px] items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-2 pr-3 font-mono text-xs text-ink-2">
              <span className="rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-medium tracking-[0.06em] text-white">
                NEW
              </span>
              Natural-language task entry · v0.4
            </div>

            <h1 className="font-display max-w-[15ch] text-[clamp(2.75rem,7vw,4.75rem)] font-medium leading-[0.95] tracking-[-0.035em]">
              The hours{" "}
              <span className="font-serif font-normal italic tracking-normal text-coral">
                you actually billed
              </span>
              .
            </h1>

            <p className="mb-9 mt-7 max-w-[44ch] text-[18px] leading-relaxed text-ink-2">
              Un time tracker per freelance che preferirebbero lavorare. Scrivi cosa hai fatto,
              premi invio, manda la fattura. Niente fogli di calcolo, niente panico del venerdì
              pomeriggio.
            </p>

            <div className="flex flex-wrap items-center gap-3.5">
              <Button asChild size="lg" className="h-12 rounded-[10px] px-5 text-[15px]">
                <Link href="/sign-in">
                  Start tracking — free <ArrowRight className="opacity-60" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-[10px] px-5 text-[15px]">
                <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
                  View on GitHub
                </a>
              </Button>
            </div>

            <div className="mt-6 font-mono text-[11.5px] tracking-[0.06em] text-muted-foreground">
              FREE FOR EVERYONE · OPEN SOURCE · SELF-HOST OK
            </div>
          </div>

          <div aria-hidden className="relative hidden h-[520px] lg:block">
            <div className="absolute right-10 top-0 w-[380px] -rotate-[2.2deg] rounded-2xl border border-border bg-card p-6 shadow-lg">
              <div className="mb-2.5 font-mono text-[11px] tracking-[0.08em] text-muted-foreground">
                WEEK 18 — 24 MAY
              </div>
              <div className="mb-3.5 font-mono text-[42px] font-medium tracking-[-0.02em]">
                25:40<span className="ml-1.5 text-lg text-muted-foreground">h</span>
              </div>
              <div className="flex h-[90px] items-end gap-2">
                {weekBars.map((v, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className={`w-full rounded ${i === 4 ? "bg-coral" : "bg-foreground/80"} ${v ? "" : "opacity-20"}`}
                      style={{ height: v ? `${(v / 6) * 70}px` : 3 }}
                    />
                    <span className="font-mono text-[10px] text-muted-foreground">{weekDays[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute left-0 top-[120px] w-[420px] rotate-[1.5deg] rounded-2xl border border-border bg-card px-[22px] py-5 shadow-lg">
              <div className="mb-3.5 flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-coral shadow-[0_0_0_4px_color-mix(in_oklch,var(--coral)_22%,transparent)]" />
                <span className="font-mono text-[12.5px] text-muted-foreground">RUNNING · 00:42:18</span>
                <span className="ml-auto rounded-md bg-coral/15 p-1.5 text-coral-2">
                  <Pause className="size-3.5" />
                </span>
              </div>
              <div className="mb-2 text-xl font-medium leading-snug">Iteration: timesheet redesign</div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm bg-coral" />
                <span className="text-[13px] text-muted-foreground">Tempist</span>
                <span className="text-mute">·</span>
                <span className="rounded bg-billable-soft px-1.5 py-0.5 text-[11px] font-medium text-billable">
                  Billable
                </span>
              </div>
            </div>

            <div className="absolute bottom-0 left-[60px] right-0 flex -rotate-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-lg">
              <Zap className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 truncate text-[13.5px]">
                <span>&quot;Call Mario tomorrow 15:00 </span>
                <span className="font-medium text-info">#demo</span>{" "}
                <span className="font-medium text-coral">p1</span>{" "}
                <span className="font-medium text-billable">60min</span>
                <span>&quot;</span>
              </div>
              <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
                ↵
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-24 flex max-w-[1100px] flex-wrap items-center justify-between gap-6 border-t border-line-soft pt-9">
          <span className="font-mono text-[11.5px] tracking-[0.1em] text-muted-foreground">
            OPEN SOURCE · SELF-HOST · NO VENDOR LOCK-IN
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-ink-2 transition-colors hover:border-foreground/20 hover:text-foreground"
            >
              <GitHubIcon className="size-4" />
              GitHub
            </a>
            <a
              href={SELF_HOST_DOC}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-ink-2 transition-colors hover:border-foreground/20 hover:text-foreground"
            >
              Self-host guide
            </a>
          </div>
        </div>
      </section>

      <section className="border-t border-line-soft px-6 py-20 md:px-12">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-5 font-mono text-[11.5px] tracking-[0.1em] text-muted-foreground">
            §01 · WHAT&apos;S IN THE BOX
          </div>
          <div className="mb-14 grid gap-12 lg:grid-cols-2">
            <h2 className="font-display text-[clamp(2rem,4vw,3.375rem)] font-medium leading-[1.05] tracking-[-0.025em]">
              Built for the small studio,
              <br />
              <span className="font-serif font-normal italic tracking-normal">not the enterprise</span>.
            </h2>
            <p className="max-w-[42ch] self-end text-[18px] leading-relaxed text-ink-2">
              Quando fatturi a ore contano tre cose: sapere dove sono finite, riuscire a mandarle in
              fattura e non perdere la testa nell&apos;amministrazione. Tempist fa esattamente questo.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.n}
                className="flex min-h-[260px] flex-col gap-3.5 rounded-xl border border-border bg-card p-7 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-[11.5px] font-medium tracking-[0.06em] ${f.color}`}>
                    §{f.n}
                  </span>
                  <span className="h-px flex-1 bg-line-soft" />
                </div>
                <h3 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.015em]">
                  {f.t}
                </h3>
                <p className="text-[14.5px] leading-relaxed text-ink-2">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line-soft px-6 py-24 md:px-12">
        <div className="mx-auto grid max-w-[1200px] items-center gap-14 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="mb-5 font-mono text-[11.5px] tracking-[0.1em] text-coral">
              §02 · QUICK ENTRY
            </div>
            <h2 className="mb-6 font-display text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.05] tracking-[-0.025em]">
              Stop opening forms.
              <br />
              <span className="font-serif font-normal italic tracking-normal">Just type.</span>
            </h2>
            <p className="mb-7 max-w-[44ch] text-[17px] leading-relaxed text-ink-2">
              Tempist riconosce clienti, progetti, date, durate e tag mentre scrivi. Premi invio,
              al resto pensiamo noi. Funziona nell&apos;app, in Raycast o da una scorciatoia.
            </p>
            <div className="flex flex-col gap-3.5">
              {parseTokens.map(([k, v, c]) => (
                <div key={k} className="flex items-center gap-3.5">
                  <span
                    className={`rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-[13px] font-medium ${c}`}
                  >
                    {k}
                  </span>
                  <span className="text-sm text-ink-2">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-lg">
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-card p-[18px]">
              <Plus className="size-4 shrink-0 text-coral" />
              <div className="flex-1 text-base">
                <span>Onboarding wireframes </span>
                <span className="font-medium text-info">#demo </span>
                <span className="font-medium text-coral">p1 </span>
                <span className="font-medium text-billable">2h30</span>
              </div>
              <span className="rounded-md border border-border px-2 py-1 font-mono text-[11px] text-muted-foreground">
                ↵
              </span>
            </div>

            <div className="mx-1 my-2 font-mono text-[10.5px] tracking-[0.08em] text-muted-foreground">
              PARSED ↓
            </div>

            <div className="rounded-xl border border-border bg-card p-[18px]">
              <dl className="grid grid-cols-[100px_1fr] gap-y-3 text-[13.5px]">
                <dt className="pt-0.5 font-mono text-[11px] tracking-[0.06em] text-muted-foreground">TITLE</dt>
                <dd>Onboarding wireframes</dd>

                <dt className="pt-0.5 font-mono text-[11px] tracking-[0.06em] text-muted-foreground">CLIENT</dt>
                <dd className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-info" />
                  Cliente Demo
                </dd>

                <dt className="pt-0.5 font-mono text-[11px] tracking-[0.06em] text-muted-foreground">PRIORITY</dt>
                <dd className="font-medium text-coral">P1 · High</dd>

                <dt className="pt-0.5 font-mono text-[11px] tracking-[0.06em] text-muted-foreground">DURATION</dt>
                <dd className="font-mono font-medium text-billable">02:30:00</dd>

                <dt className="pt-0.5 font-mono text-[11px] tracking-[0.06em] text-muted-foreground">BILLABLE</dt>
                <dd>
                  <span className="rounded bg-billable-soft px-2 py-0.5 text-[11.5px] font-medium text-billable">
                    YES · €150 @ €60/h
                  </span>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line-soft px-6 py-24 md:px-12">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-5 font-mono text-[11.5px] tracking-[0.1em] text-muted-foreground">
            §03 · PRICING
          </div>
          <h2 className="mb-3.5 font-display text-[clamp(2rem,4vw,3rem)] font-medium tracking-[-0.025em]">
            Honest pricing.
          </h2>
          <p className="mb-12 max-w-[50ch] text-[17px] text-ink-2">
            Tre piani. Stesso prezzo. La fattura la mandi ai clienti, non a noi.
          </p>

          <div className="grid gap-4.5 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative flex flex-col gap-4.5 rounded-2xl border p-7 ${
                  p.primary
                    ? "border-foreground bg-foreground text-background shadow-lg"
                    : "border-border bg-card shadow-sm"
                }`}
              >
                {p.badge && (
                  <span className="absolute -top-3 left-6 rounded-full bg-coral px-2.5 py-1 font-mono text-[10.5px] font-medium tracking-[0.08em] text-white">
                    {p.badge}
                  </span>
                )}
                <span className="text-xl font-semibold tracking-[-0.01em]">{p.name}</span>
                <div className="flex flex-wrap items-baseline gap-2">
                  {p.ghostPrice && (
                    <span className="font-mono text-[22px] font-medium tracking-[-0.02em] line-through opacity-40">
                      {p.ghostPrice}
                    </span>
                  )}
                  <span className="font-mono text-[50px] font-medium tracking-[-0.03em]">{p.price}</span>
                  <span className="text-[13px] opacity-65">{p.per}</span>
                </div>
                <div className={`h-px ${p.primary ? "bg-white/12" : "bg-line-soft"}`} />
                <ul className="flex flex-col gap-3">
                  {p.feats.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm leading-snug">
                      <Check className={`mt-0.5 size-4 shrink-0 ${p.primary ? "text-coral-2" : "text-coral"}`} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex-1" />
                <Button
                  asChild
                  variant={p.primary ? "coral" : "default"}
                  className="w-full rounded-[10px]"
                >
                  <Link href="/sign-in">{p.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="self-host"
        className="border-t border-line-soft px-6 py-24 md:px-12 scroll-mt-20"
      >
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-5 font-mono text-[11.5px] tracking-[0.1em] text-muted-foreground">
            §04 · OPEN SOURCE
          </div>
          <h2 className="mb-6 font-display text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.05] tracking-[-0.025em]">
            Fork it. Host it.
            <br />
            <span className="font-serif font-normal italic tracking-normal">Own your hours.</span>
          </h2>
          <ul className="mb-10 max-w-[52ch] space-y-3 text-[17px] leading-relaxed text-ink-2">
            <li className="flex gap-3">
              <Check className="mt-1 size-4 shrink-0 text-coral" />
              <span>
                Codice su{" "}
                <a
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  GitHub
                </a>
                : clone, fork, PR benvenute.
              </span>
            </li>
            <li className="flex gap-3">
              <Check className="mt-1 size-4 shrink-0 text-coral" />
              <span>
                Deploy con Dockerfile standalone + worker pg-boss sul tuo Postgres — guida{" "}
                <a
                  href={SELF_HOST_DOC}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Coolify
                </a>
                .
              </span>
            </li>
            <li className="flex gap-3">
              <Check className="mt-1 size-4 shrink-0 text-coral" />
              <span>
                In dev: <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[13px]">pnpm dev</code> +{" "}
                <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[13px]">pnpm worker:dev</code> — niente
                SaaS obbligatorio.
              </span>
            </li>
          </ul>
          <div className="flex flex-wrap gap-3.5">
            <Button asChild size="lg" className="h-12 rounded-[10px] px-5">
              <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
                View on GitHub <GitHubIcon className="size-4 opacity-70" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 rounded-[10px] px-5">
              <a href={SELF_HOST_DOC} target="_blank" rel="noopener noreferrer">
                Self-host guide
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-line-soft px-6 py-24 md:px-12">
        <div className="relative mx-auto flex max-w-[1100px] flex-col gap-10 overflow-hidden rounded-3xl bg-foreground px-8 py-14 text-background shadow-lg md:flex-row md:items-center md:justify-between md:px-14">
          <div className="relative z-10 flex-1">
            <h2 className="mb-4 font-display text-[clamp(2.25rem,4vw,3.375rem)] font-medium leading-none tracking-[-0.025em]">
              Make Friday
              <br />
              <span className="font-serif font-normal italic tracking-normal text-coral-2">
                feel like Friday.
              </span>
            </h2>
            <p className="max-w-[38ch] text-[17px] opacity-70">
              Bastano novanta secondi per partire. Prova Tempist sulle ore di questa settimana —
              ai fogli di calcolo puoi sempre tornare.
            </p>
          </div>
          <div className="relative z-10 flex flex-col gap-3">
            <Button asChild variant="coral" size="lg" className="h-13 rounded-xl px-7 text-base">
              <Link href="/sign-in">
                Start tracking — free <ArrowRight className="opacity-80" />
              </Link>
            </Button>
            <span className="text-center font-mono text-[11px] tracking-[0.08em] opacity-55">
              NO CREDIT CARD · 2 MIN SETUP
            </span>
          </div>
          <span
            aria-hidden
            className="pointer-events-none absolute -right-5 -top-8 font-serif text-[380px] italic leading-none text-coral-2 opacity-[0.05]"
          >
            t
          </span>
        </div>
      </section>

      <footer className="px-6 pb-16 pt-12 md:px-12">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-start justify-between gap-10">
          <div className="max-w-[300px]">
            <div className="mb-3 flex items-center gap-2.5">
              <BrandMark className="h-[26px] w-[26px] text-[13px]" />
              <span className="text-base font-semibold tracking-[-0.02em]">Tempist</span>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Un time tracker per freelance e piccoli studi. Open source, self-hostable.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-14 gap-y-8 text-[13px] text-ink-2">
            <FooterCol title="PRODUCT" items={["Features", "Pricing", "Changelog", "Roadmap"]} />
            <FooterLinkCol
              title="OPEN SOURCE"
              links={[
                { label: "GitHub", href: GITHUB_REPO },
                { label: "Self-host guide", href: SELF_HOST_DOC },
                { label: "Issues", href: `${GITHUB_REPO}/issues` },
              ]}
            />
            <FooterLinkCol
              title="DOCS"
              links={[
                { label: "Deploy (Coolify)", href: SELF_HOST_DOC },
                { label: "AGENTS.md", href: `${GITHUB_REPO}/blob/main/AGENTS.md` },
              ]}
            />
          </div>
        </div>
        <div className="mx-auto mt-9 flex max-w-[1200px] flex-wrap justify-between gap-3 border-t border-line-soft pt-6 font-mono text-xs tracking-[0.06em] text-muted-foreground">
          <span>© 2026 Tempist · Open source</span>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            github.com/marcotommoro/tempist
          </a>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="mb-1 font-mono text-[11px] tracking-[0.08em] text-muted-foreground">{title}</span>
      {items.map((i) => (
        <span key={i} className="cursor-default transition-colors hover:text-foreground">
          {i}
        </span>
      ))}
    </div>
  );
}

function FooterLinkCol({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="mb-1 font-mono text-[11px] tracking-[0.08em] text-muted-foreground">{title}</span>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-foreground"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
