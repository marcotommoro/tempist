"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type HoursByDayPoint = { day: string; hours: number };

const monoStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fill: "var(--muted-foreground)",
  letterSpacing: "0.04em",
} as const;

export function HoursByDayChart({ data }: { data: HoursByDayPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center font-display text-base italic text-muted-foreground">
        Nessun dato nel range.
      </div>
    );
  }
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: -16 }}>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="2 4"
            opacity={0.6}
          />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={monoStyle}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={monoStyle}
            width={32}
          />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.6 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const v = Number(payload[0]?.value ?? 0);
              return (
                <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-md">
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    {String(label)}
                  </div>
                  <div className="mt-0.5 font-display text-xl leading-none tabular-nums text-foreground">
                    {v.toFixed(2)}
                    <span className="ml-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      h
                    </span>
                  </div>
                </div>
              );
            }}
          />
          <Bar
            dataKey="hours"
            fill="var(--coral)"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
