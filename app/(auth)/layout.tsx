export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center bg-background p-6">
      {/* Editorial atmosphere: subtle coral wash + soft grain. CSS-only, lightweight. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(circle_at_50%_30%,black,transparent_70%)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,oklch(0.68_0.20_25/0.12),transparent_55%)]" />
      </div>

      {/* Brand mark — small, top-left */}
      <div className="absolute left-6 top-6 inline-flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground font-display text-[0.9375rem] italic leading-none text-background">
          T
        </span>
        <span className="font-display text-base text-foreground">
          Todoist+Tracker
        </span>
      </div>

      <div className="w-full max-w-sm">{children}</div>

      {/* Footer */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
        Crafted for power users
      </div>
    </div>
  );
}
