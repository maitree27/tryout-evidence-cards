"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { overallFrom, type Overrides } from "@/lib/progress";
import type { MetricResult } from "@/sports/types";

/** Coach overrides one metric's score (null clears it). The coach overall is recomputed from the effective scores. */
export async function setOverride(videoId: string, metricKey: string, score: number | null) {
  const parsed = z.number().min(0).max(100).nullable().safeParse(score);
  if (!parsed.success) return { error: "Score must be 0-100" };
  const supabase = await createClient();

  if (parsed.data === null) {
    await supabase.from("score_overrides").delete().eq("video_id", videoId).eq("metric_key", metricKey);
  } else {
    const { error } = await supabase.from("score_overrides").upsert({
      video_id: videoId, metric_key: metricKey, coach_score: Math.round(parsed.data), updated_at: new Date().toISOString(),
    });
    if (error) return { error: error.message };
  }

  const [{ data: analysis }, { data: rows }] = await Promise.all([
    supabase.from("analyses").select("metrics").eq("video_id", videoId).maybeSingle(),
    supabase.from("score_overrides").select("metric_key, coach_score").eq("video_id", videoId),
  ]);
  if (analysis) {
    const overrides: Overrides = Object.fromEntries((rows ?? []).map((r) => [r.metric_key, Number(r.coach_score)]));
    const coachOverall = rows?.length ? overallFrom(analysis.metrics as MetricResult[], overrides) : null;
    await supabase.from("analyses").update({ coach_overall: coachOverall }).eq("video_id", videoId);
  }
  revalidatePath(`/videos/${videoId}`);
  revalidatePath("/");
  return {};
}

export async function setReviewed(videoId: string, reviewed: boolean) {
  const supabase = await createClient();
  await supabase.from("videos").update({ reviewed_at: reviewed ? new Date().toISOString() : null }).eq("id", videoId);
  revalidatePath(`/videos/${videoId}`);
  revalidatePath("/");
}

export async function addNote(athleteId: string, videoId: string | null, formData: FormData) {
  const user = await getUser();
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (!user || !body) return;
  const supabase = await createClient();
  await supabase.from("coach_notes").insert({ athlete_id: athleteId, video_id: videoId, author_id: user.id, body });
  revalidatePath(`/athletes/${athleteId}`);
  if (videoId) revalidatePath(`/videos/${videoId}`);
}

export async function deleteNote(noteId: string, athleteId: string, videoId: string | null) {
  const supabase = await createClient();
  await supabase.from("coach_notes").delete().eq("id", noteId);
  revalidatePath(`/athletes/${athleteId}`);
  if (videoId) revalidatePath(`/videos/${videoId}`);
}
