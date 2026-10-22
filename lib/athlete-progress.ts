import type { ProgressPoint } from "@/lib/progress";

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => new Date(`${s}T00:00:00Z`);

/** Monday of the week containing `d` (UTC). Weeks run Monday to Sunday. */
export function weekStart(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return new Date(x.getTime() - ((x.getUTCDay() + 6) % 7) * DAY);
}

export type CalendarCell = { date: string; uploaded: boolean; future: boolean; today: boolean };

export type AthleteProgress = {
  latest: number | null;
  change: number | null; // latest minus previous clip
  clipsThisWeek: number;
  clipsLastWeek: number;
  streakWeeks: number;
  streakAlive: boolean; // already uploaded this week
  calendar: CalendarCell[]; // 8 weeks x 7 days, filled column by column (Mon..Sun per week)
  bestGain: { label: string; delta: number } | null;
  newPb: boolean;
  pbs: { key: string; label: string; value: number; date: string; isNew: boolean }[];
  skills: { key: string; label: string; latest: number; delta: number | null; series: number[] }[];
};

export function buildAthleteProgress(points: ProgressPoint[], today = new Date()): AthleteProgress {
  const pts = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const n = pts.length;
  const latest = n ? pts[n - 1] : null;
  const prev = n > 1 ? pts[n - 2] : null;

  const uploadDays = new Set(pts.map((p) => p.date));
  const uploadWeeks = new Set(pts.map((p) => iso(weekStart(parse(p.date)))));
  const thisWeek = weekStart(today);
  const lastWeek = new Date(thisWeek.getTime() - 7 * DAY);

  // Streak = consecutive weeks with at least one upload. This week doesn't have to be done yet.
  const streakAlive = uploadWeeks.has(iso(thisWeek));
  let w = streakAlive ? thisWeek : lastWeek;
  let streakWeeks = 0;
  while (uploadWeeks.has(iso(w))) {
    streakWeeks++;
    w = new Date(w.getTime() - 7 * DAY);
  }

  const todayIso = iso(today);
  const first = new Date(thisWeek.getTime() - 7 * 7 * DAY);
  const calendar: CalendarCell[] = [];
  for (let wk = 0; wk < 8; wk++) {
    for (let d = 0; d < 7; d++) {
      const date = iso(new Date(first.getTime() + (wk * 7 + d) * DAY));
      calendar.push({ date, uploaded: uploadDays.has(date), future: date > todayIso, today: date === todayIso });
    }
  }

  const metricKeys = latest ? latest.metrics.map((m) => ({ key: m.key, label: m.label })) : [];
  const scoreOf = (p: ProgressPoint, key: string) => p.metrics.find((m) => m.key === key)?.score ?? null;

  const skills = metricKeys.map(({ key, label }) => {
    const series = pts.map((p) => scoreOf(p, key)).filter((v): v is number => v !== null);
    const l = latest ? scoreOf(latest, key) : null;
    const p = prev ? scoreOf(prev, key) : null;
    return { key, label, latest: l ?? 0, delta: l !== null && p !== null ? l - p : null, series };
  }).filter((s) => s.series.length > 0);

  const bestGainSkill = skills.filter((s) => s.delta !== null).sort((a, b) => b.delta! - a.delta!)[0];

  const pbOf = (key: string, label: string, get: (p: ProgressPoint) => number | null) => {
    const vals = pts.map((p) => ({ v: get(p), date: p.date })).filter((x): x is { v: number; date: string } => x.v !== null);
    if (!vals.length) return null;
    const best = vals.reduce((a, b) => (b.v >= a.v ? b : a)); // latest date wins ties
    const earlierBest = vals.slice(0, -1).reduce((m, x) => Math.max(m, x.v), -1);
    const isNew = vals.length > 1 && vals[vals.length - 1].v > earlierBest;
    return { key, label, value: best.v, date: best.date, isNew };
  };
  const pbs = [
    pbOf("overall", "Overall score", (p) => p.overall),
    ...metricKeys.map((m) => pbOf(m.key, m.label, (p) => scoreOf(p, m.key))),
  ].filter((x): x is NonNullable<typeof x> => x !== null)
   .sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.value - a.value);

  return {
    latest: latest ? latest.overall : null,
    change: latest && prev ? latest.overall - prev.overall : null,
    clipsThisWeek: pts.filter((p) => iso(weekStart(parse(p.date))) === iso(thisWeek)).length,
    clipsLastWeek: pts.filter((p) => iso(weekStart(parse(p.date))) === iso(lastWeek)).length,
    streakWeeks,
    streakAlive,
    calendar,
    bestGain: bestGainSkill && bestGainSkill.delta! > 0 ? { label: bestGainSkill.label, delta: bestGainSkill.delta! } : null,
    newPb: pbs.some((p) => p.key === "overall" && p.isNew),
    pbs,
    skills,
  };
}
