"use client";

import { useState, useTransition } from "react";
import { setOverride } from "@/app/actions/review";
import { Button } from "@/components/ui/button";
import type { MetricResult } from "@/sports/types";

/** One row per metric: shows the AI score, lets the coach type their own, and clear it again. */
export function ScoreEditor({ videoId, metrics, overrides }: { videoId: string; metrics: MetricResult[]; overrides: Record<string, number> }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [draft, setDraft] = useState<Record<string, string>>({});

  function save(key: string, value: string) {
    setError(undefined);
    const trimmed = value.trim();
    const n = trimmed === "" ? null : Number(trimmed);
    if (n !== null && (!Number.isFinite(n) || n < 0 || n > 100)) return setError("Scores must be a number from 0 to 100.");
    start(async () => {
      const res = await setOverride(videoId, key, n);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-4">
        {metrics.map((m) => {
          const override = overrides[m.key];
          const shown = override ?? m.score;
          return (
            <li key={m.key}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{m.label}</span>
                <span className="flex items-center gap-2">
                  <span className="text-muted">AI {m.reliable ? m.score : "n/a"}</span>
                  <input
                    aria-label={`Your score for ${m.label}`}
                    inputMode="numeric"
                    placeholder="Your score"
                    defaultValue={override ?? ""}
                    onChange={(e) => setDraft({ ...draft, [m.key]: e.target.value })}
                    onBlur={(e) => { if ((override?.toString() ?? "") !== e.target.value.trim()) save(m.key, e.target.value); }}
                    className="w-24 rounded-ui border border-border px-2 py-1 text-right text-sm"
                  />
                  {override !== undefined && (
                    <Button variant="ghost" className="min-h-8 px-2 text-xs" onClick={() => save(m.key, "")} disabled={pending}>Reset</Button>
                  )}
                </span>
              </div>
              <div className="my-1 h-2 overflow-hidden rounded-full bg-black/10">
                <div className={override !== undefined ? "h-full bg-warning" : "h-full bg-primary"} style={{ width: `${shown ?? 0}%` }} />
              </div>
              <p className="text-xs text-muted">{m.detail}</p>
            </li>
          );
        })}
      </ul>
      {error && <p className="text-sm text-danger">{error}</p>}
      <p className="text-xs text-muted">Orange bars are your own scores. They replace the AI score in the overall score and in the student's trends.</p>
    </div>
  );
}
