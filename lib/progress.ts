import type { MetricResult } from "@/sports/types";

export type Overrides = Record<string, number>;

/** Score actually used everywhere: the coach's override if there is one, otherwise the AI's. */
export function effectiveScore(m: MetricResult, overrides: Overrides): number | null {
  return overrides[m.key] ?? m.score;
}

/** Weighted average of effective scores; needs at least 4 metrics, same rule as the AI overall. */
export function overallFrom(metrics: MetricResult[], overrides: Overrides): number | null {
  const used = metrics.filter((m) => effectiveScore(m, overrides) !== null);
  if (used.length < 4) return null;
  const w = used.reduce((a, m) => a + m.weight, 0);
  return Math.round(used.reduce((a, m) => a + effectiveScore(m, overrides)! * m.weight, 0) / w);
}

export type ProgressPoint = {
  videoId: string;
  date: string; // yyyy-mm-dd
  overall: number; // coach overall if set, else AI
  aiOverall: number;
  reviewed: boolean;
  metrics: MetricResult[];
};

export type AthleteSummary = {
  latest: number | null;
  previous: number | null;
  change: number | null; // latest minus the average of up to the 3 analyses before it
  best: number | null;
  count: number;
  lastDate: string | null;
  unreviewed: number;
  flags: ("declining" | "unreviewed" | "inactive" | "new")[];
};

const DAY = 86_400_000;

export function summarize(points: ProgressPoint[], today = new Date()): AthleteSummary {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const n = sorted.length;
  const latest = n ? sorted[n - 1].overall : null;
  const prior = sorted.slice(Math.max(0, n - 4), n - 1).map((p) => p.overall);
  const change = latest !== null && prior.length ? Math.round(latest - prior.reduce((a, b) => a + b, 0) / prior.length) : null;
  const lastDate = n ? sorted[n - 1].date : null;
  const unreviewed = sorted.filter((p) => !p.reviewed).length;

  const flags: AthleteSummary["flags"] = [];
  if (n === 0) flags.push("new");
  if (change !== null && change <= -5) flags.push("declining");
  if (unreviewed > 0) flags.push("unreviewed");
  if (lastDate && (today.getTime() - new Date(lastDate).getTime()) / DAY > 14) flags.push("inactive");

  return {
    latest,
    previous: n > 1 ? sorted[n - 2].overall : null,
    change,
    best: n ? Math.max(...sorted.map((p) => p.overall)) : null,
    count: n,
    lastDate,
    unreviewed,
    flags,
  };
}
