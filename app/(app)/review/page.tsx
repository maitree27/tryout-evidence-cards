import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { shotLabel } from "@/sports/cricket/shots";

type Row = {
  id: string;
  shot_type: string;
  taken_on: string;
  athletes: { name: string } | { name: string }[] | null;
  analyses: { overall: number; coach_overall: number | null } | { overall: number; coach_overall: number | null }[] | null;
};
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

// The review queue: clips that have been analysed but not yet marked reviewed by the coach.
export default async function ReviewPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("videos")
    .select("id, shot_type, taken_on, athletes(name), analyses(overall, coach_overall)")
    .eq("status", "analyzed")
    .is("reviewed_at", null)
    .order("taken_on", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 pt-6">
      <div>
        <h1 className="text-3xl">Review</h1>
        <p className="mt-1 text-sm text-muted">{rows.length === 0 ? "You're all caught up." : `${rows.length} clip${rows.length === 1 ? "" : "s"} waiting for your eyes.`}</p>
      </div>
      <section className="flex flex-col gap-2" aria-label="Clips to review">
        {rows.length === 0 ? (
          <div className="glass p-6 text-center text-sm text-muted">Nothing to review. New analysed clips will show up here.</div>
        ) : (
          rows.map((r) => {
            const a = one(r.analyses);
            return (
              <Link key={r.id} href={`/videos/${r.id}`} className="glass flex items-center gap-3 px-4 py-3 transition active:scale-[0.98] hover:opacity-90">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{one(r.athletes)?.name ?? "Student"}</span>
                  <span className="block truncate text-xs text-muted">{shotLabel(r.shot_type)} · {r.taken_on}</span>
                </span>
                <span className="dot text-[1.75rem]">{a ? (a.coach_overall ?? a.overall) : "–"}</span>
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}
