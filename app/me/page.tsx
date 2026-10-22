import Link from "next/link";
import { Badge, Card } from "@/components/ui/card";
import { loadProgress } from "@/lib/data";
import { summarize } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";
import { shotLabel } from "@/sports/cricket/shots";

// Athlete home. Row-level security returns only this athlete's own record, videos and results.
export default async function AthleteHome() {
  const supabase = await createClient();
  const { data: athlete } = await supabase.from("athletes").select("id, name").maybeSingle();

  if (!athlete) {
    return (
      <>
        <h1 className="text-4xl">Welcome</h1>
        <Card className="text-sm">Your login isn&apos;t linked to a coach yet. Ask your coach to send you an invite link.</Card>
      </>
    );
  }

  const [progress, { data: videos }] = await Promise.all([
    loadProgress(supabase, athlete.id),
    supabase.from("videos").select("id, shot_type, taken_on, status").eq("athlete_id", athlete.id).order("taken_on", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  const points = progress[athlete.id] ?? [];
  const s = summarize(points);
  const byVideo = new Map(points.map((p) => [p.videoId, p]));

  return (
    <>
      <h1 className="text-5xl leading-none">Hi {athlete.name.split(" ")[0]}</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Latest", s.latest ?? "–"],
          ["Change", s.change === null ? "–" : `${s.change > 0 ? "+" : ""}${s.change}`],
          ["Personal best", s.best ?? "–"],
          ["Clips", s.count],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <div className="text-xs text-muted">{label}</div>
            <div className="font-display text-4xl">{value}</div>
          </Card>
        ))}
      </div>
      <Link href="/me/upload" className="inline-flex min-h-11 items-center bg-accent px-5 font-mono text-xs font-bold uppercase tracking-wider text-foreground hover:bg-foreground hover:text-background">
        + Upload a clip
      </Link>

      <section className="space-y-2">
        <h2>Your sessions</h2>
        {(videos ?? []).length === 0 ? (
          <Card className="text-sm text-muted">No clips yet. Film a short side-on batting clip and upload it.</Card>
        ) : (
          <ul className="space-y-2">
            {videos!.map((v) => {
              const p = byVideo.get(v.id);
              return (
                <li key={v.id}>
                  <Link href={`/me/videos/${v.id}`}>
                    <Card className="flex items-center justify-between gap-3 hover:border-primary">
                      <span>{shotLabel(v.shot_type)} · {v.taken_on}</span>
                      {p ? <span className="font-display text-3xl">{p.overall}</span> : <Badge>{v.status}</Badge>}
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
