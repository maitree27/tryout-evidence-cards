"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { templateFeedback } from "@/lib/analysis/feedback";
import { createClient, getUser } from "@/lib/supabase/server";
import { BATTING_METRICS, CONFIG_VERSION } from "@/sports/cricket/batting";
import type { AnalysisResult, MetricResult } from "@/sports/types";

const DEMO_TAG = "Demo student (sample data, safe to delete)";

// Fixed pseudo-random numbers so the demo looks the same every time.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

// Each metric has its own habit, so every student has believable strengths and weaknesses.
const OFFSETS: Record<string, number> = {
  stance_balance: 8, head_stillness: -10, head_over_knee: 2, backlift: 6, swing_path: -2,
  footwork: -8, weight_transfer: -4, timing: 0, follow_through: 6,
};

const SHOTS = ["front_foot_drive", "forward_defence", "pull", "cut", "drill", "back_foot_defence"];

const STUDENTS = [
  { name: "Aarav Sharma", hand: "right", from: 52, to: 79, weeks: 8, lastAgo: 3, unreviewed: 1, seed: 1 },
  { name: "Ben Carter", hand: "right", from: 70, to: 71, weeks: 8, lastAgo: 5, unreviewed: 0, seed: 2 },
  { name: "Chloe Davies", hand: "left", from: 76, to: 56, weeks: 8, lastAgo: 2, unreviewed: 3, seed: 3 },
  { name: "Dev Patel", hand: "right", from: 48, to: 60, weeks: 6, lastAgo: 31, unreviewed: 0, seed: 4 },
  { name: "Ella Moore", hand: "left", from: 0, to: 0, weeks: 0, lastAgo: 0, unreviewed: 0, seed: 5 },
] as const;

const clamp = (n: number) => Math.max(5, Math.min(98, Math.round(n)));

function makeResult(level: number, rand: () => number): AnalysisResult {
  const metrics: MetricResult[] = BATTING_METRICS.map((m) => {
    const score = clamp(level + OFFSETS[m.key] + (rand() - 0.5) * 14);
    return {
      key: m.key, label: m.label, unit: m.unit, ideal: m.ideal, weight: m.weight,
      raw: Math.round(score) / 100, score, reliable: true,
      detail: `Demo data: ${m.label.toLowerCase()} scored ${score}/100 (not measured from real video).`,
    };
  });
  const overall = Math.round(metrics.reduce((a, m) => a + m.score! * m.weight, 0));
  return {
    configVersion: CONFIG_VERSION, overall, metrics,
    quality: { framesTotal: 120, framesWithPose: 110, poseCoverage: 0.92, warnings: ["Demo data: no real video behind these scores."] },
  };
}

export async function loadDemoData() {
  const user = await getUser();
  if (!user) return { error: "Not signed in" };
  const supabase = await createClient();

  const { count } = await supabase.from("athletes").select("id", { count: "exact", head: true }).eq("notes", DEMO_TAG);
  if (count) return { error: "Demo data is already loaded." };

  const { data: athletes, error } = await supabase
    .from("athletes")
    .insert(STUDENTS.map((s) => ({ coach_id: user.id, name: s.name, batting_hand: s.hand, is_minor: true, notes: DEMO_TAG })))
    .select("id, name");
  if (error || !athletes) return { error: error?.message ?? "Could not create students" };

  const videos: Record<string, unknown>[] = [];
  const analyses: Record<string, unknown>[] = [];
  const notes: Record<string, unknown>[] = [];
  const now = Date.now();

  for (const s of STUDENTS) {
    const athlete = athletes.find((a) => a.name === s.name)!;
    const rand = rng(s.seed * 7919);
    for (let i = 0; i < s.weeks; i++) {
      const level = s.from + ((s.to - s.from) * i) / Math.max(1, s.weeks - 1);
      const daysAgo = s.lastAgo + (s.weeks - 1 - i) * 7;
      const date = new Date(now - daysAgo * 86_400_000).toISOString().slice(0, 10);
      const id = randomUUID();
      const result = makeResult(level, rand);
      const reviewed = i < s.weeks - s.unreviewed;
      videos.push({
        id, athlete_id: athlete.id, uploaded_by: user.id, storage_path: null,
        shot_type: SHOTS[i % SHOTS.length], taken_on: date, duration_s: 8, status: "analyzed",
        reviewed_at: reviewed ? new Date(now - Math.max(0, daysAgo - 1) * 86_400_000).toISOString() : null,
      });
      analyses.push({
        video_id: id, config_version: result.configVersion, overall: result.overall,
        metrics: result.metrics, quality: result.quality, feedback: templateFeedback(result), feedback_model: "demo",
      });
      if (i === s.weeks - 1 || i === 2) {
        notes.push({
          athlete_id: athlete.id, video_id: id, author_id: user.id,
          body: i === 2 ? "Working on getting the front foot closer to the line of the ball." : "Good session. Keep the head still through contact.",
        });
      }
    }
  }

  const v = await supabase.from("videos").insert(videos);
  if (v.error) return { error: v.error.message };
  const a = await supabase.from("analyses").insert(analyses);
  if (a.error) return { error: a.error.message };
  await supabase.from("coach_notes").insert(notes);

  revalidatePath("/");
  return {};
}

export async function clearDemoData() {
  const supabase = await createClient();
  await supabase.from("athletes").delete().eq("notes", DEMO_TAG);
  revalidatePath("/");
}
