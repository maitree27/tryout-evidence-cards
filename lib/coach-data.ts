import type { SupabaseClient } from "@supabase/supabase-js";
import { loadProgress } from "@/lib/data";
import { summarize, type AthleteSummary } from "@/lib/progress";

export type Tone = "good" | "warn" | "bad" | "none";
export type CoachRow = {
  id: string;
  name: string;
  score: number | null;
  change: number | null;
  note: string;
  tone: Tone;
  kind: "declining" | "inactive" | "review" | "improving" | "steady" | "new";
  unreviewed: number;
};

function describe(s: AthleteSummary): Pick<CoachRow, "note" | "tone" | "kind"> {
  if (s.flags.includes("new")) return { note: "No clips yet", tone: "none", kind: "new" };
  if (s.flags.includes("declining")) return { note: "Dipping lately", tone: "bad", kind: "declining" };
  if (s.flags.includes("inactive")) return { note: "Quiet for 2+ weeks", tone: "warn", kind: "inactive" };
  if (s.flags.includes("unreviewed")) return { note: `${s.unreviewed} clip${s.unreviewed === 1 ? "" : "s"} to review`, tone: "warn", kind: "review" };
  if ((s.change ?? 0) >= 5) return { note: "Improving", tone: "good", kind: "improving" };
  return { note: "Steady", tone: "good", kind: "steady" };
}

const RANK: Record<CoachRow["kind"], number> = { declining: 0, inactive: 1, review: 2, steady: 3, improving: 3, new: 4 };

/** The coach's active students with a one-line status each, sorted so who needs attention comes first. */
export async function loadCoachRows(supabase: SupabaseClient) {
  const [{ data: athletes }, progress] = await Promise.all([
    supabase.from("athletes").select("id, name, archived, notes").order("name"),
    loadProgress(supabase),
  ]);
  const all = athletes ?? [];
  const rows: CoachRow[] = all
    .filter((a) => !a.archived)
    .map((a) => {
      const s = summarize(progress[a.id] ?? []);
      return { id: a.id, name: a.name, score: s.latest, change: s.change, unreviewed: s.unreviewed, ...describe(s) };
    });
  rows.sort((a, b) => RANK[a.kind] - RANK[b.kind] || (b.score ?? -1) - (a.score ?? -1));

  const scored = rows.filter((r) => r.score !== null);
  const average = scored.length ? Math.round(scored.reduce((x, r) => x + r.score!, 0) / scored.length) : null;
  const changes = rows.map((r) => r.change).filter((c): c is number => c !== null);
  const averageChange = changes.length ? Math.round(changes.reduce((x, c) => x + c, 0) / changes.length) : null;
  return {
    rows,
    average,
    averageChange,
    needLook: rows.filter((r) => r.kind === "declining" || r.kind === "inactive").length,
    toReview: rows.reduce((x, r) => x + r.unreviewed, 0),
    hasDemo: all.some((a) => a.notes?.startsWith("Demo student")),
  };
}
