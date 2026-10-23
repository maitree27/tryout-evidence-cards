"use client";

import { effectiveScore } from "@/lib/progress";
import { DRILLS, LEVEL_LABEL, MOMENT_LABEL, PHASES, levelOf, type Level, type MomentKey } from "@/sports/cricket/phases";
import type { MetricResult } from "@/sports/types";

type Events = { setupEnd: number; backlift: number; landing: number; contact: number } | null;

const COLOUR: Record<Level, string> = { good: "text-success", ok: "text-warning", work: "text-danger" };
const BAR: Record<Level, string> = { good: "bg-success", ok: "bg-warning", work: "bg-danger" };

function jumpTo(t: number) {
  window.dispatchEvent(new CustomEvent("willow-seek", { detail: { t } }));
}

/**
 * "Moves": the shot broken into its moves. For each move: how it scored, what it means, what good looks like,
 * how it changed since the last clip, and a drill. Tap a moment to jump the video to it.
 */
export function DeepDive({
  metrics,
  overrides,
  previous,
  events,
  duration,
}: {
  metrics: MetricResult[];
  overrides: Record<string, number>;
  previous: { date: string; scores: Record<string, number | null> } | null;
  events: Events;
  duration: number | null;
}) {
  const byKey = new Map(metrics.map((m) => [m.key, m]));
  const score = (key: string) => {
    const m = byKey.get(key);
    return m ? effectiveScore(m, overrides) : null;
  };

  const end = Math.max(duration ?? 0, events ? events.contact + 0.5 : 0, 1);
  const moments: { key: MomentKey; t: number }[] | null = events
    ? [
        { key: "start", t: 0 },
        { key: "backlift", t: events.backlift },
        { key: "landing", t: events.landing },
        { key: "contact", t: events.contact },
        { key: "finish", t: Math.min(end, events.contact + 0.35) },
      ]
    : null;
  const momentTime = (k: MomentKey) => moments?.find((m) => m.key === k)?.t ?? null;

  const phases = PHASES.map((p) => {
    const rows = p.metrics.map((k) => ({ key: k, metric: byKey.get(k), score: score(k) })).filter((r) => r.metric);
    const scored = rows.filter((r) => r.score !== null) as { key: string; metric: MetricResult; score: number }[];
    const avg = scored.length ? Math.round(scored.reduce((a, r) => a + r.score, 0) / scored.length) : null;
    return { ...p, rows, avg, level: avg === null ? null : levelOf(avg) };
  });

  const weakest = metrics
    .map((m) => ({ m, s: effectiveScore(m, overrides) }))
    .filter((x): x is { m: MetricResult; s: number } => x.s !== null)
    .sort((a, b) => a.s - b.s)
    .slice(0, 2)
    .filter((x) => x.s < 75);
  const firstOpen = phases.findIndex((p) => p.level === "work" || p.level === "ok");

  return (
    <div className="flex flex-col gap-4">
      {moments ? (
        <section className="glass p-4" aria-label="Key moments">
          <div className="mb-3 text-sm text-muted">Tap a moment to jump the video to it</div>
          <div className="relative mb-4 h-1.5 rounded-full bg-foreground/10" aria-hidden="true">
            {moments.map((m) => (
              <span key={m.key} className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" style={{ left: `${Math.min(100, (m.t / end) * 100)}%` }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {moments.map((m) => (
              <button key={m.key} type="button" onClick={() => jumpTo(m.t)} className="rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium transition active:scale-95">
                {MOMENT_LABEL[m.key]} <span className="text-muted">{m.t.toFixed(1)}s</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <p className="glass p-4 text-sm text-muted">Moment markers appear for clips analysed in Willow. This clip has none.</p>
      )}

      {weakest.length > 0 && (
        <section className="tile tile-orange" aria-label="What to practise first">
          <div className="text-sm opacity-90">Practise first</div>
          <ul className="mt-2 flex flex-col gap-3">
            {weakest.map(({ m, s }) => (
              <li key={m.key}>
                <div className="font-semibold">{m.label} · {s}</div>
                <div className="mt-0.5 text-sm opacity-95">{DRILLS[m.key]?.drill}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {phases.map((p, i) => (
        <details key={p.key} className="glass overflow-hidden" open={i === firstOpen}>
          <summary className="flex cursor-pointer items-center gap-3 p-4">
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{p.title}</span>
              <span className="block text-xs text-muted">{p.blurb}</span>
            </span>
            {p.level && <span className={`text-xs font-medium ${COLOUR[p.level]}`}>{LEVEL_LABEL[p.level]}</span>}
            <span className="dot text-[1.75rem]">{p.avg ?? "–"}</span>
          </summary>
          <div className="flex flex-col gap-4 border-t border-border p-4">
            {momentTime(p.moment) !== null && (
              <button type="button" onClick={() => jumpTo(momentTime(p.moment)!)} className="self-start rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium transition active:scale-95">
                Watch this moment ({momentTime(p.moment)!.toFixed(1)}s)
              </button>
            )}
            {p.rows.map(({ key, metric, score: s }) => {
              const prevScore = previous?.scores[key] ?? null;
              const diff = s !== null && prevScore !== null ? s - prevScore : null;
              const level = s === null ? null : levelOf(s);
              return (
                <div key={key}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{metric!.label}</span>
                    <span className="flex items-baseline gap-2">
                      {diff !== null && <span className={`text-xs ${diff >= 0 ? "text-success" : "text-danger"}`}>{diff > 0 ? "+" : ""}{diff} vs {previous!.date}</span>}
                      <span className="font-medium">{s === null ? "not measured" : `${s}/100`}</span>
                    </span>
                  </div>
                  <div className="my-1.5 h-2 overflow-hidden rounded-full bg-foreground/10">
                    <div className={`h-full rounded-full ${level ? BAR[level] : ""}`} style={{ width: `${s ?? 0}%` }} />
                  </div>
                  <p className="text-sm text-muted">{metric!.detail}</p>
                  <p className="mt-1 text-xs text-muted">Good looks like: {metric!.ideal}</p>
                  {level && level !== "good" && DRILLS[key] && (
                    <div className="mt-2 rounded-xl bg-foreground/5 p-3 text-sm">
                      <p>{DRILLS[key].weak}</p>
                      <p className="mt-1.5"><strong>Try this:</strong> {DRILLS[key].drill}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      ))}

      <p className="text-xs text-muted">These are automatic estimates from video, based on a first set of rules. Your coach has the final say.</p>
    </div>
  );
}
