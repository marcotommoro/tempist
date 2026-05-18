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

export function HoursByDayChart({ data }: { data: HoursByDayPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
        Nessun dato nel range.
      </div>
    );
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="day" fontSize={11} tickFormatter={(v: string) => v.slice(5)} />
          <YAxis fontSize={11} />
          <Tooltip
            formatter={(v) => [`${Number(v).toFixed(2)}h`, "Ore"]}
            labelFormatter={(label) => `Giorno ${String(label)}`}
          />
          <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
