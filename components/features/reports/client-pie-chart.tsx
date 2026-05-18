"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export type ClientSlice = {
  name: string;
  hours: number;
  color: string;
};

export function ClientPieChart({ data }: { data: ClientSlice[] }) {
  const meaningful = data.filter((d) => d.hours > 0);
  if (meaningful.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
        Nessun cliente con ore nel range.
      </div>
    );
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={meaningful}
            dataKey="hours"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={70}
            label={(props: { name?: string }) => props.name ?? ""}
            labelLine={false}
            fontSize={11}
          >
            {meaningful.map((s, i) => (
              <Cell key={i} fill={s.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => [`${Number(v).toFixed(2)}h`, "Ore"]} />
          <Legend iconType="circle" fontSize={11} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
