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

/** The metrics of the student's previous analysed clip before `takenOn` (for "change since last clip"). */
export async function loadPreviousMetrics(supabase: SupabaseClient, athleteId: string, videoId: string, takenOn: string) {
  const { data } = await supabase
    .from("videos")
    .select("id, taken_on, analyses(metrics)")
    .eq("athlete_id", athleteId)
    .eq("status", "analyzed")
    .neq("id", videoId)
    .lte("taken_on", takenOn)
    .order("taken_on", { ascending: false })
    .limit(1);
  const row = data?.[0];
  const a = (Array.isArray(row?.analyses) ? row?.analyses[0] : row?.analyses) as { metrics: MetricResult[] } | null | undefined;
  if (!row || !a) return null;
  return { date: row.taken_on as string, scores: Object.fromEntries(a.metrics.map((m) => [m.key, m.score])) as Record<string, number | null> };
}
