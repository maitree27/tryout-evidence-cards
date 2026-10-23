import type { SupabaseClient } from "@supabase/supabase-js";
import { PlayBoth } from "@/components/play-both";
import { SkeletonVideo } from "@/components/skeleton-video";
import { Card } from "@/components/ui/card";
import { effectiveScore } from "@/lib/progress";
import { shotLabel } from "@/sports/cricket/shots";
import type { MetricResult } from "@/sports/types";

type Row = { id: string; taken_on: string; shot_type: string; storage_path: string | null; analyses: { metrics: MetricResult[]; overall: number; coach_overall: number | null } | { metrics: MetricResult[]; overall: number; coach_overall: number | null }[] | null };
const one = <T,>(x: T | T[] | null) => (Array.isArray(x) ? x[0] ?? null : x);

/** Two analysed clips of one student, side by side, with the change in every score. Works for coach and student (database rules decide what is visible). */
export async function CompareView({ supabase, athleteId, a, b, action }: { supabase: SupabaseClient; athleteId: string; a?: string; b?: string; action: string }) {
  const { data } = await supabase
    .from("videos")
    .select("id, taken_on, shot_type, storage_path, analyses(metrics, overall, coach_overall)")
    .eq("athlete_id", athleteId)
    .eq("status", "analyzed")
    .order("taken_on", { ascending: false });
  const clips = ((data ?? []) as unknown as Row[]).filter((r) => one(r.analyses));
  const label = (r: Row) => `${r.taken_on} · ${shotLabel(r.shot_type)} · ${one(r.analyses)!.coach_overall ?? one(r.analyses)!.overall}`;

  if (clips.length < 2) {
    return <Card className="text-sm text-muted">You need at least two analysed clips to compare. Upload and analyse another one first.</Card>;
  }

  // Default: newest clip against the one before it.
  const B = clips.find((c) => c.id === b) ?? clips[0];
  const A = clips.find((c) => c.id === a) ?? clips.filter((c) => c.id !== B.id)[0];

  const side = async (r: Row) => {
    const signed = r.storage_path ? (await supabase.storage.from("videos").createSignedUrl(r.storage_path, 3600)).data?.signedUrl ?? null : null;
    const kp = r.storage_path ? (await supabase.storage.from("videos").createSignedUrl(r.storage_path.replace(/\.[^./]+$/, ".keypoints.json"), 3600)).data?.signedUrl ?? null : null;
    return { signed, kp };
  };
  const [sa, sb] = await Promise.all([side(A), side(B)]);
  const ma = one(A.analyses)!.metrics, mb = one(B.analyses)!.metrics;
  const rows = mb.map((m) => {
    const x = effectiveScore(ma.find((q) => q.key === m.key) ?? m, {});
    const y = effectiveScore(m, {});
    return { key: m.key, label: m.label, x: ma.find((q) => q.key === m.key) ? x : null, y };
  });

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="glass flex flex-col gap-3 p-4 text-sm">
        <label className="flex flex-col gap-1">Earlier clip
          <select name="a" defaultValue={A.id} className="rounded-ui border border-border bg-card px-3 py-2">{clips.map((c) => <option key={c.id} value={c.id}>{label(c)}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1">Later clip
          <select name="b" defaultValue={B.id} className="rounded-ui border border-border bg-card px-3 py-2">{clips.map((c) => <option key={c.id} value={c.id}>{label(c)}</option>)}</select>
        </label>
        <button className="self-start rounded-full bg-primary px-5 py-2 font-medium text-primary-foreground">Compare</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        <div><div className="mb-1 text-xs text-muted">Earlier · {A.taken_on}</div>{sa.signed ? <SkeletonVideo src={sa.signed} keypointsUrl={sa.kp} /> : null}</div>
        <div><div className="mb-1 text-xs text-muted">Later · {B.taken_on}</div>{sb.signed ? <SkeletonVideo src={sb.signed} keypointsUrl={sb.kp} /> : null}</div>
      </div>
      <PlayBoth />

      <Card>
        <h2 className="text-lg">What changed</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {rows.map((r) => {
            const d = r.x !== null && r.y !== null ? r.y - r.x : null;
            return (
              <li key={r.key} className="flex items-center justify-between gap-3">
                <span>{r.label}</span>
                <span className="tabular-nums text-muted">{r.x ?? "–"} → {r.y ?? "–"}{" "}
                  {d !== null && <b className={d > 0 ? "text-success" : d < 0 ? "text-warning" : ""}>{d > 0 ? `+${d}` : d}</b>}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
