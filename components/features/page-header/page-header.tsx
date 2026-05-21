import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  /** Editorial italic emphasis next to the title (renders in display serif italic). */
  emphasis?: React.ReactNode;
  /** Mono uppercase tracked line above the title — eyebrow / category label. */
  eyebrow?: React.ReactNode;
  /** Mono uppercase tracked metadata line below the title. Use `·` to separate items. */
  meta?: React.ReactNode;
  /** Optional supportive description in body sans (one short line). */
  description?: React.ReactNode;
  /** Optional right-aligned slot (button, badge, link). */
  actions?: React.ReactNode;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

/**
 * Editorial page header used at the top of every (app)/* page.
 * Pattern: optional eyebrow → display-serif title → mono meta line → optional description.
 */
export function PageHeader({
  title,
  emphasis,
  eyebrow,
  meta,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "relative mb-8 flex items-end justify-between gap-6 border-b border-border/70 pt-10 pb-5",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        {eyebrow ? (
          <div className="font-mono text-[0.625em] uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-display text-[2.5em] leading-[1.08] tracking-[-0.008em] text-balance text-foreground">
          {title}
          {emphasis ? (
            <span className="font-serif font-normal italic text-muted-foreground"> {emphasis}</span>
          ) : null}
        </h1>
        {meta ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.6875em] uppercase tracking-[0.11em] text-muted-foreground">
            {meta}
          </div>
        ) : null}
        {description ? (
          <p className="max-w-prose pt-1 text-[0.8125em] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 items-center gap-2 pb-1">{actions}</div>
      ) : null}
    </header>
  );
}
