import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setArchived, updateAthlete } from "@/app/actions/athletes";
import { AthleteForm } from "@/components/athlete-form";
import { Button } from "@/components/ui/button";
import { addNote, deleteNote, setNoteVisible } from "@/app/actions/review";
import { revokeInvite } from "@/app/actions/invites";
import { CopyLink } from "@/components/copy-link";
import { InviteAthlete } from "@/components/invite-athlete";
import { TrendChart, type TrendRow } from "@/components/trend-chart";
import { Textarea } from "@/components/ui/form";
import { loadProgress } from "@/lib/data";
import { summarize } from "@/lib/progress";
import { BATTING_METRICS } from "@/sports/cricket/batting";
import { UploadVideo } from "@/components/upload-video";
import { Badge, Card } from "@/components/ui/card";
import { shotLabel } from "@/sports/cricket/shots";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function AthletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: athlete } = await supabase.from("athletes").select("*").eq("id", id).maybeSingle();
  if (!athlete) notFound();
  const user = await getUser();
  const points = (await loadProgress(supabase, id))[id] ?? [];
  const summary = summarize(points);
  const rows: TrendRow[] = points.map((p) => ({
    date: p.date, overall: p.overall,
    ...Object.fromEntries(p.metrics.map((m) => [m.key, m.score])),
  }));
  const { data: notes } = await supabase
    .from("coach_notes").select("id, body, created_at, video_id, visible_to_athlete").eq("athlete_id", id).order("created_at", { ascending: false });
  const { data: invites } = await supabase
    .from("invites").select("id, email, token, expires_at, accepted_at").eq("athlete_id", id).order("created_at", { ascending: false });
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const latest = points[points.length - 1];
  const earlier = points[points.length - 2];
  const { data: videos } = await supabase
    .from("videos")
    .select("id, shot_type, taken_on, status")
    .eq("athlete_id", id)
    .order("taken_on", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-4xl">{athlete.name}</h1>
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Latest score", summary.latest ?? "–"],
          ["Change vs recent", summary.change === null ? "–" : `${summary.change > 0 ? "+" : ""}${summary.change}`],
          ["Personal best", summary.best ?? "–"],
          ["Analysed videos", summary.count],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <div className="text-xs text-muted">{label}</div>
            <div className="font-display text-4xl">{value}</div>
          </Card>
        ))}
      </div>
      {summary.flags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {summary.flags.includes("declining") && <Badge tone="bad">Scores declining</Badge>}
          {summary.flags.includes("unreviewed") && <Badge tone="warn">{summary.unreviewed} not reviewed</Badge>}
          {summary.flags.includes("inactive") && <Badge tone="warn">No upload for 2+ weeks</Badge>}
        </div>
      )}
      {points.length > 0 && (
        <>
          <Card>
            <h2 className="mb-3 font-medium">Progress over time</h2>
            <TrendChart rows={rows} metrics={BATTING_METRICS.map((m) => ({ key: m.key, label: m.label }))} />
          </Card>
          <Card>
            <h2 className="mb-3 font-medium">Skills: latest vs previous</h2>
            <ul className="divide-y divide-border text-sm">
              {latest.metrics.map((m) => {
                const prev = earlier?.metrics.find((x) => x.key === m.key)?.score ?? null;
                const best = Math.max(...points.map((p) => p.metrics.find((x) => x.key === m.key)?.score ?? 0));
                const diff = m.score !== null && prev !== null ? m.score - prev : null;
                return (
                  <li key={m.key} className="flex items-center justify-between py-2">
                    <span>{m.label}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-muted">best {best}</span>
                      <span className="w-10 text-right font-medium">{m.score ?? "–"}</span>
                      <span className={`w-10 text-right text-xs ${diff === null ? "text-muted" : diff >= 0 ? "text-primary" : "text-danger"}`}>
                        {diff === null ? "" : `${diff > 0 ? "+" : ""}${diff}`}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
            {summary.best !== null && summary.latest === summary.best && summary.count > 1 && (
              <p className="mt-2 text-sm text-primary">🏆 Latest score is a personal best.</p>
            )}
          </Card>
        </>
      )}
      <Card className="max-w-lg">
        <h2 className="mb-3 font-medium">Upload a batting clip</h2>
        <UploadVideo athleteId={id} folderOwnerId={user!.id} uploaderId={user!.id} />
      </Card>
      <section className="space-y-2">
        <h2 className="font-medium">Videos</h2>
        {(videos ?? []).length === 0 ? (
          <p className="text-sm text-muted">No videos yet.</p>
        ) : (
          <ul className="space-y-2">
            {videos!.map((v) => (
              <li key={v.id}>
                <Link href={`/videos/${v.id}`}>
                  <Card className="flex items-center justify-between hover:border-primary">
                    <span>{shotLabel(v.shot_type)} · {v.taken_on}</span>
                    <Badge>{v.status}</Badge>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Card className="max-w-lg">
        <h2 className="mb-3 font-medium">Athlete access</h2>
        {athlete.user_id ? (
          <p className="text-sm">✓ {athlete.name} has joined and can see their own videos and results.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">Invite {athlete.name} so they can upload their own clips and follow their progress. They can only ever see their own data.</p>
            <InviteAthlete athleteId={id} />
            {(invites ?? []).filter((i) => !i.accepted_at).map((i) => {
              const expired = new Date(i.expires_at) < new Date();
              return (
                <div key={i.id} className="space-y-2 border-t-2 border-border pt-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span>{i.email} · {expired ? "expired" : `valid until ${new Date(i.expires_at).toLocaleDateString()}`}</span>
                    <form action={revokeInvite.bind(null, i.id, id)}>
                      <Button variant="ghost" type="submit" className="min-h-8 px-2 text-xs">Cancel</Button>
                    </form>
                  </div>
                  {!expired && <CopyLink url={`${origin}/invite/${i.token}`} />}
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <Card>
        <h2 className="mb-3 font-medium">Notes</h2>
        <form action={addNote.bind(null, id, null)} className="space-y-2">
          <Textarea name="body" required placeholder="A note about this student (not tied to one video)" />
          <Button type="submit" variant="outline">Add note</Button>
        </form>
        <ul className="mt-4 space-y-2">
          {(notes ?? []).map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-2 rounded-ui bg-black/5 p-3 text-sm">
              <div>
                <p>{n.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {new Date(n.created_at).toLocaleDateString()}
                  {n.video_id && <> · <Link href={`/videos/${n.video_id}`} className="underline">on a video</Link></>}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <form action={setNoteVisible.bind(null, n.id, !n.visible_to_athlete, id, n.video_id)}>
                  <Button variant="outline" type="submit" className="min-h-8 px-2 text-xs">{n.visible_to_athlete ? "Shared · hide" : "Private · share"}</Button>
                </form>
                <form action={deleteNote.bind(null, n.id, id, n.video_id)}>
                  <Button variant="ghost" type="submit" className="min-h-8 px-2 text-xs">Delete</Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="max-w-lg">
        <h2 className="mb-3 font-medium">Student details</h2>
        <AthleteForm action={updateAthlete.bind(null, id)} initial={athlete} submitLabel="Save changes" />
      </Card>
      <form action={setArchived.bind(null, id, !athlete.archived)}>
        <Button variant="outline" type="submit">{athlete.archived ? "Restore student" : "Archive student"}</Button>
      </form>
    </div>
  );
}
