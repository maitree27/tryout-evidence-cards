import type { SupabaseClient } from "@supabase/supabase-js";
import { effectiveScore, type Overrides, type ProgressPoint } from "@/lib/progress";
import type { MetricResult } from "@/sports/types";

/** Every analysed video as a progress point, grouped by student. Coach overrides are already applied. */
export async function loadProgress(supabase: SupabaseClient, athleteId?: string) {
  let q = supabase
    .from("videos")
    .select("id, athlete_id, taken_on, reviewed_at, analyses(overall, coach_overall, metrics)")
    .eq("status", "analyzed")
    .order("taken_on");
  if (athleteId) q = q.eq("athlete_id", athleteId);
  const [{ data: videos }, { data: overrideRows }] = await Promise.all([
    q,
    supabase.from("score_overrides").select("video_id, metric_key, coach_score"),
  ]);

  const byVideo: Record<string, Overrides> = {};
  for (const o of overrideRows ?? []) (byVideo[o.video_id] ??= {})[o.metric_key] = Number(o.coach_score);

  const out: Record<string, ProgressPoint[]> = {};
  for (const v of videos ?? []) {
    const a = (Array.isArray(v.analyses) ? v.analyses[0] : v.analyses) as
      | { overall: number; coach_overall: number | null; metrics: MetricResult[] }
      | null;
    if (!a) continue;
    const ov = byVideo[v.id] ?? {};
    (out[v.athlete_id] ??= []).push({
      videoId: v.id,
      date: v.taken_on,
      aiOverall: Number(a.overall),
      overall: Number(a.coach_overall ?? a.overall),
      reviewed: !!v.reviewed_at,
      metrics: a.metrics.map((m) => ({ ...m, score: effectiveScore(m, ov) })),
    });
  }
  return out;
}
