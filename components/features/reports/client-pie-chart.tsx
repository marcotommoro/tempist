"use client";

export type ClientSlice = {
  name: string;
  hours: number;
  color: string;
};

/**
 * Editorial replacement for the original pie chart.
 *
 * Per UX guideline `no-pie-overuse` (>5 categories) and our editorial direction,
 * a horizontal stacked bar communicates proportion with clearer labels and
 * tabular-numeric values that align cleanly.
 */
export function ClientPieChart({ data }: { data: ClientSlice[] }) {
  const meaningful = data.filter((d) => d.hours > 0);
  if (meaningful.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center font-display text-base italic text-muted-foreground">
        Nessun cliente con ore nel range.
      </div>
    );
  }

  const total = meaningful.reduce((s, d) => s + d.hours, 0);
  const sorted = [...meaningful].sort((a, b) => b.hours - a.hours);

  return (
    <div className="space-y-3">
      {/* Stacked horizontal bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-sm ring-1 ring-inset ring-border">
        {sorted.map((s, i) => {
          const pct = (s.hours / total) * 100;
          return (
            <div
              key={i}
              role="presentation"
              title={`${s.name} · ${s.hours.toFixed(2)}h`}
              style={{ width: `${pct}%`, backgroundColor: s.color }}
              className="h-full"
            />
          );
        })}
      </div>

      {/* Legend / row breakdown */}
      <ul className="space-y-1">
        {sorted.map((s, i) => {
          const pct = (s.hours / total) * 100;
          return (
            <li
              key={i}
              className="grid grid-cols-[12px_1fr_auto_64px] items-center gap-2 text-[12px]"
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/10"
                style={{ backgroundColor: s.color }}
              />
              <span className="truncate text-foreground">{s.name}</span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {s.hours.toFixed(2)}h
              </span>
              <span className="text-right font-mono text-[10px] uppercase tabular-nums tracking-wider text-muted-foreground">
                {pct.toFixed(1)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
