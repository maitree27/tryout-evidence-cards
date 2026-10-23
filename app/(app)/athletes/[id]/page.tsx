import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setArchived, updateAthlete } from "@/app/actions/athletes";
import { AthleteForm } from "@/components/athlete-form";
import { Button } from "@/components/ui/button";
import { addNote, deleteNote, setNoteVisible } from "@/app/actions/review";
import { revokeInvite } from "@/app/actions/invites";
import { DeleteAthlete } from "@/components/delete-athlete";
import { CopyLink } from "@/components/copy-link";
import { InviteAthlete } from "@/components/invite-athlete";
import { TrendChart, type TrendRow } from "@/components/trend-chart";
import { Textarea } from "@/components/ui/form";
import { loadProgress } from "@/lib/data";
import { summarize } from "@/lib/progress";
import { BATTING_METRICS } from "@/sports/cricket/batting";
import { UploadVideo } from "@/components/upload-video";
import { Tabs } from "@/components/aura/tabs";
import { BigNumber, Tile } from "@/components/aura/parts";
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
  const { data: consent } = await supabase.from("consents").select("consenter_name, consenter_role, accepted_at").eq("athlete_id", id).maybeSingle();
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
  const scoreOf = new Map(points.map((p) => [p.videoId, p.overall]));

  const overview = (
    <>
      <section className="grid grid-cols-2 gap-3" aria-label="Highlights">
        <Tile color="pink" label="Best so far" value={summary.best ?? "–"} />
        <Tile color="blue" label="Analysed clips" value={summary.count} />
      </section>
      {points.length > 0 ? (
        <>
          <Card><TrendChart rows={rows} metrics={BATTING_METRICS.map((m) => ({ key: m.key, label: m.label }))} /></Card>
          <Card>
            <h2 className="mb-2">Skills: now vs last time</h2>
            <ul className="divide-y divide-border text-sm">
              {latest.metrics.map((m) => {
                const prev = earlier?.metrics.find((x) => x.key === m.key)?.score ?? null;
                const diff = m.score !== null && prev !== null ? m.score - prev : null;
                return (
                  <li key={m.key} className="flex items-center justify-between py-2.5">
                    <span>{m.label}</span>
                    <span className="flex items-center gap-3">
                      <span className="w-8 text-right font-medium">{m.score ?? "–"}</span>
                      <span className={`w-9 text-right text-xs ${diff === null ? "text-muted" : diff >= 0 ? "text-success" : "text-danger"}`}>{diff === null ? "" : `${diff > 0 ? "+" : ""}${diff}`}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      ) : (
        <Card className="text-sm text-muted">No analysed clips yet. Open the Clips tab to upload one.</Card>
      )}
    </>
  );

  const clips = (
    <>
      <details className="glass p-4" open={(videos ?? []).length === 0}>
        <summary className="cursor-pointer font-medium">Upload a batting clip</summary>
        <div className="mt-4"><UploadVideo athleteId={id} folderOwnerId={user!.id} uploaderId={user!.id} /></div>
      </details>
      {(videos ?? []).length === 0 ? (
        <p className="glass p-4 text-sm text-muted">No clips yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {videos!.map((v) => (
            <li key={v.id}>
              <Link href={`/videos/${v.id}`} className="glass flex items-center justify-between gap-3 px-4 py-3 transition active:scale-[0.98] hover:opacity-90">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">{shotLabel(v.shot_type)}</span>
                  <span className="block text-xs text-muted">{v.taken_on}</span>
                </span>
                {scoreOf.get(v.id) !== undefined ? <span className="dot text-[1.75rem]">{scoreOf.get(v.id)}</span> : <Badge>{v.status}</Badge>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  const notesTab = (
    <>
      <Card>
        <form action={addNote.bind(null, id, null)} className="space-y-2">
          <Textarea name="body" required placeholder="A note about this student (not tied to one clip)" />
          <Button type="submit" variant="outline">Add note</Button>
        </form>
      </Card>
      <ul className="flex flex-col gap-2">
        {(notes ?? []).map((n) => (
          <li key={n.id} className="glass flex items-start justify-between gap-3 p-4 text-sm">
            <div>
              <p>{n.body}</p>
              <p className="mt-1 text-xs text-muted">
                {new Date(n.created_at).toLocaleDateString()}
                {n.video_id && <> · <Link href={`/videos/${n.video_id}`} className="underline">on a clip</Link></>}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <form action={setNoteVisible.bind(null, n.id, !n.visible_to_athlete, id, n.video_id)}>
                <Button variant="outline" type="submit" className="min-h-8 px-3 text-xs">{n.visible_to_athlete ? "Shared · hide" : "Private · share"}</Button>
              </form>
              <form action={deleteNote.bind(null, n.id, id, n.video_id)}>
                <Button variant="ghost" type="submit" className="min-h-8 px-3 text-xs">Delete</Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </>
  );

  const access = (
    <>
      <Card>
        <h2 className="mb-3">Student's own login</h2>
        {athlete.user_id ? (
          <div className="space-y-1 text-sm">
            <p>{athlete.name} has joined and can see their own clips and results.</p>
            {consent ? (
              <p className="text-muted">Consent accepted by {consent.consenter_name} ({consent.consenter_role === "parent_guardian" ? "parent or guardian" : "the player, 18+"}) on {new Date(consent.accepted_at).toLocaleDateString()}.</p>
            ) : (
              <p className="text-warning">Waiting for consent. {athlete.name} can&apos;t use the app until a parent, guardian or adult player accepts the privacy notice.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">Invite {athlete.name} so they can upload their own clips and follow their progress. They only ever see their own data.</p>
            <InviteAthlete athleteId={id} />
            {(invites ?? []).filter((i) => !i.accepted_at).map((i) => {
              const expired = new Date(i.expires_at) < new Date();
              return (
                <div key={i.id} className="space-y-2 border-t border-border pt-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span>{i.email} · {expired ? "expired" : `valid until ${new Date(i.expires_at).toLocaleDateString()}`}</span>
                    <form action={revokeInvite.bind(null, i.id, id)}>
                      <Button variant="ghost" type="submit" className="min-h-8 px-3 text-xs">Cancel</Button>
                    </form>
                  </div>
                  {!expired && <CopyLink url={`${origin}/invite/${i.token}`} />}
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <details className="glass p-4">
        <summary className="cursor-pointer font-medium">Edit student details</summary>
        <div className="mt-4"><AthleteForm action={updateAthlete.bind(null, id)} initial={athlete} submitLabel="Save changes" /></div>
      </details>
      <form action={setArchived.bind(null, id, !athlete.archived)}>
        <Button variant="outline" type="submit" className="w-full">{athlete.archived ? "Restore student" : "Archive student"}</Button>
      </form>
      <details className="glass border-danger/50 p-4">
        <summary className="cursor-pointer font-medium text-danger">Delete this student</summary>
        <div className="mt-4"><DeleteAthlete athleteId={id} name={athlete.name} /></div>
      </details>
    </>
  );

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-5 pt-6">
      <Link href="/students" className="text-sm text-muted hover:text-foreground">← Students</Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl">{athlete.name}</h1>
        <div className="flex flex-wrap justify-end gap-1.5">
          {summary.flags.includes("declining") && <Badge tone="bad">Declining</Badge>}
          {summary.flags.includes("unreviewed") && <Badge tone="warn">{summary.unreviewed} to review</Badge>}
          {summary.flags.includes("inactive") && <Badge tone="warn">Quiet</Badge>}
        </div>
      </div>
      <BigNumber
        label="Latest score"
        value={summary.latest ?? "–"}
        size="text-[5.5rem]"
        note={summary.change === null ? undefined : summary.change === 0 ? "same as recent clips" : `${summary.change > 0 ? "up" : "down"} ${Math.abs(summary.change)} vs recent clips`}
      />
      <Tabs
        tabs={[
          { key: "overview", label: "Overview", content: overview },
          { key: "clips", label: "Clips", content: clips },
          { key: "notes", label: "Notes", content: notesTab },
          { key: "access", label: "Access", content: access },
        ]}
      />
    </div>
  );
}
