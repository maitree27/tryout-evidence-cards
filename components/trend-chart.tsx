"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type TrendRow = { date: string; [key: string]: number | string | null };

export function TrendChart({ rows, metrics }: { rows: TrendRow[]; metrics: { key: string; label: string }[] }) {
  const [key, setKey] = useState("overall");
  return (
    <div className="space-y-2">
      <select
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="rounded-ui border border-border bg-card px-2 py-1 text-sm"
        aria-label="Metric to chart"
      >
        <option value="overall">Overall score</option>
        {metrics.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
      </select>
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey={key} stroke="var(--primary)" strokeWidth={2} dot connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
