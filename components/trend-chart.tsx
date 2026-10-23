"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type TrendRow = { date: string; [key: string]: number | string | null };

/** One soft line over time. Tap a chip to switch between the overall score and any single skill. */
export function TrendChart({ rows, metrics, initial = "overall" }: { rows: TrendRow[]; metrics: { key: string; label: string }[]; initial?: string }) {
  const options = [{ key: "overall", label: "Overall" }, ...metrics];
  const [key, setKey] = useState(options.some((o) => o.key === initial) ? initial : "overall");
  const values = rows.map((r) => r[key]).filter((v): v is number => typeof v === "number");
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const label = options.find((o) => o.key === key)?.label ?? "";

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Choose what to chart">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setKey(o.key)}
            aria-pressed={key === o.key}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition active:scale-95 ${key === o.key ? "border-transparent bg-foreground text-background" : "border-border bg-card"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-sm text-muted">{label}</div>
          <div className="dot text-5xl">{last ?? "–"}</div>
        </div>
        {last !== undefined && prev !== undefined && (
          <div className={`text-sm font-medium ${last - prev >= 0 ? "text-success" : "text-danger"}`}>{last - prev >= 0 ? "up" : "down"} {Math.abs(last - prev)} since last</div>
        )}
      </div>
      <div className="h-52 w-full" role="img" aria-label={`${label} over time`}>
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={(d: string) => d.slice(5)} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" }} />
            <Line type="monotone" dataKey={key} stroke="var(--success)" strokeWidth={3} dot={{ r: 3, fill: "var(--success)", strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
