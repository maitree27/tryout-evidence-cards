import Link from "next/link";
import { AnalyzeAll } from "@/components/analyze-all";
import { Chips } from "@/components/aura/chips";
import { loadProgress } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { shotLabel } from "@/sports/cricket/shots";

export default async function ClipsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = "all" } = await searchParams;
  const supabase = await createClient();
  const { data: athlete } = await supabase.from("athletes").select("id").maybeSingle();
  if (!athlete) return null;

  const [progress, { data: videos }] = await Promise.all([
    loadProgress(supabase, athlete.id),
    supabase.from("videos").select("id, shot_type, taken_on, status, storage_path").eq("athlete_id", athlete.id).order("taken_on", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  const scoreOf = new Map((progress[athlete.id] ?? []).map((p) => [p.videoId, p.overall]));
  const all = (videos ?? []).map((v) => ({ ...v, score: scoreOf.get(v.id) ?? null }));
  const scored = all.filter((v) => v.score !== null);
  const waiting = all.filter((v) => v.score === null);
  const shown = filter === "scored" ? scored : filter === "waiting" ? waiting : all;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 pt-6">
      <h1 className="text-3xl">Clips</h1>
      <AnalyzeAll waiting={waiting.map((v) => ({ id: v.id, path: v.storage_path, title: shotLabel(v.shot_type) }))} />
      <Chips
        active={filter === "scored" || filter === "waiting" ? filter : "all"}
        items={[
          { key: "all", label: "All", href: "/me/clips", count: all.length },
          { key: "scored", label: "Scored", href: "/me/clips?filter=scored", count: scored.length },
          { key: "waiting", label: "Waiting", href: "/me/clips?filter=waiting", count: waiting.length },
        ]}
      />
      <section className="flex flex-col gap-2" aria-label="Your clips">
        {shown.length === 0 ? (
          <p className="glass p-4 text-sm text-muted">{all.length === 0 ? "No clips yet. Tap the + button to upload your first one." : "Nothing here."}</p>
        ) : (
          shown.map((v) => (
            <Link key={v.id} href={`/me/videos/${v.id}`} className="glass flex items-center justify-between gap-3 px-4 py-3 transition active:scale-[0.98] hover:opacity-90">
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium">{shotLabel(v.shot_type)}</span>
                <span className="block text-xs text-muted">{v.taken_on}</span>
              </span>
              {v.score !== null ? <span className="dot text-[1.75rem]">{v.score}</span> : <span className="text-xs text-muted">Tap to analyse</span>}
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
