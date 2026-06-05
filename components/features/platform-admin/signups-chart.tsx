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

export type SignupsChartPoint = { day: string; signups: number; activeUsers: number };

const monoStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fill: "var(--muted-foreground)",
  letterSpacing: "0.04em",
} as const;

export function SignupsChart({ data }: { data: SignupsChartPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center font-serif text-lg italic text-muted-foreground">
        Nessun dato negli ultimi 30 giorni.
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
          <YAxis tickLine={false} axisLine={false} tick={monoStyle} width={32} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.6 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const signups = Number(payload.find((p) => p.dataKey === "signups")?.value ?? 0);
              const activeUsers = Number(
                payload.find((p) => p.dataKey === "activeUsers")?.value ?? 0,
              );
              return (
                <div className="rounded-md border border-border bg-background px-3 py-2 font-mono text-[0.6875em] shadow-sm">
                  <div className="mb-1 text-muted-foreground">{label}</div>
                  <div>Iscrizioni: {signups}</div>
                  <div>Utenti attivi: {activeUsers}</div>
                </div>
              );
            }}
          />
          <Bar dataKey="signups" fill="var(--foreground)" radius={[2, 2, 0, 0]} maxBarSize={24} />
          <Bar dataKey="activeUsers" fill="var(--coral)" radius={[2, 2, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
