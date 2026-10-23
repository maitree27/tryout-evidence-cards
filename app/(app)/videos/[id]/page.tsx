import Link from "next/link";
import { MomentNoteForm } from "@/components/moment-note-form";
import { SeekChip } from "@/components/seek-chip";
import { notFound } from "next/navigation";
import { addNote, deleteNote, setNoteVisible, setReviewed } from "@/app/actions/review";
import { AnalyzeVideo } from "@/components/analyze-video";
import { BigNumber } from "@/components/aura/parts";
import { DeepDive } from "@/components/aura/deep-dive";
import { Tabs } from "@/components/aura/tabs";
import { FeedbackText } from "@/components/feedback-text";
import { ScoreEditor } from "@/components/score-editor";
import { SkeletonVideo } from "@/components/skeleton-video";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";
import { loadPreviousMetrics } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { MetricResult } from "@/sports/types";
import { shotLabel } from "@/sports/cricket/shots";

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: video } = await supabase.from("videos").select("*, athletes(id, name)").eq("id", id).maybeSingle();
  if (!video) notFound();

  // Videos are private: the only way to watch is a link that expires in an hour.
  const signed = video.storage_path ? (await supabase.storage.from("videos").createSignedUrl(video.storage_path, 3600)).data : null;

  const [{ data: analysis }, { data: overrideRows }, { data: notes }] = await Promise.all([
    supabase.from("analyses").select("*").eq("video_id", id).maybeSingle(),
    supabase.from("score_overrides").select("metric_key, coach_score").eq("video_id", id),
    supabase.from("coach_notes").select("id, body, created_at, visible_to_athlete, at_s").eq("video_id", id).order("created_at", { ascending: false }),
  ]);
  // The saved body positions sit next to the video in the same private bucket.
  const keypointsPath = video.storage_path?.replace(/\.[^./]+$/, ".keypoints.json");
  const keypointsUrl =
    analysis && keypointsPath ? (await supabase.storage.from("videos").createSignedUrl(keypointsPath, 3600)).data?.signedUrl ?? null : null;
  const metrics = (analysis?.metrics ?? []) as MetricResult[];
  const overrides = Object.fromEntries((overrideRows ?? []).map((r) => [r.metric_key, Number(r.coach_score)]));
  const warnings: string[] = analysis?.quality?.warnings ?? [];
  const finalScore = analysis?.coach_overall ?? analysis?.overall;
  const name = video.athletes.name;
  const previous = analysis ? await loadPreviousMetrics(supabase, video.athlete_id, id, video.taken_on) : null;
  const movesTab = analysis ? (
    <DeepDive metrics={metrics} overrides={overrides} previous={previous} events={analysis.quality?.events ?? null} duration={video.duration_s ? Number(video.duration_s) : null} />
  ) : (
    <Card className="text-sm text-muted">Analyse the video to break the shot into moves.</Card>
  );

  const scoresTab = analysis ? (
    <>
      {warnings.length > 0 && (
        <Card className="text-sm text-warning">
          <ul className="list-disc space-y-1 pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </Card>
      )}
      <Card><ScoreEditor videoId={id} metrics={metrics} overrides={overrides} /></Card>
    </>
  ) : (
    <Card className="text-sm text-muted">Tap “Analyse this video” above to get scores and feedback.</Card>
  );

  const feedbackTab = analysis?.feedback ? (
    <Card>
      <FeedbackText text={analysis.feedback} />
      <p className="mt-3 text-xs text-muted">Written by {analysis.feedback_model} from the measurements in Scores.</p>
    </Card>
  ) : (
    <Card className="text-sm text-muted">Feedback appears here after the video is analysed.</Card>
  );

  const notesTab = (
    <>
      <Card>
        <MomentNoteForm action={addNote.bind(null, video.athletes.id, id)} />
      </Card>
      <ul className="flex flex-col gap-2">
        {(notes ?? []).map((n) => (
          <li key={n.id} className="glass flex items-start justify-between gap-3 p-4 text-sm">
            <div>
              {n.at_s !== null && n.at_s !== undefined && <SeekChip t={Number(n.at_s)} />}
              <p>{n.body}</p>
              <p className="mt-1 text-xs text-muted">{new Date(n.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <form action={setNoteVisible.bind(null, n.id, !n.visible_to_athlete, video.athletes.id, id)}>
                <Button variant="outline" type="submit" className="min-h-8 px-3 text-xs">{n.visible_to_athlete ? "Shared · hide" : "Private · share"}</Button>
              </form>
              <form action={deleteNote.bind(null, n.id, video.athletes.id, id)}>
                <Button variant="ghost" type="submit" className="min-h-8 px-3 text-xs">Delete</Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </>
  );

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-5 pt-6">
      <Link href={`/athletes/${video.athletes.id}`} className="text-sm text-muted hover:text-foreground">← {name}</Link>
      <div>
        <h1 className="text-3xl">{shotLabel(video.shot_type)}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>{video.taken_on}</span>
          {video.reviewed_at ? <Badge tone="good">Reviewed</Badge> : analysis ? <Badge tone="warn">Not reviewed</Badge> : <Badge>{video.status}</Badge>}
        </div>
      </div>

      {signed?.signedUrl ? (
        <SkeletonVideo src={signed.signedUrl} keypointsUrl={keypointsUrl} />
      ) : (
        <Card className="text-sm text-muted">{video.storage_path ? "Couldn't load the video." : "This is a demo entry, so there is no video file."}</Card>
      )}

      {signed?.signedUrl && <AnalyzeVideo videoId={id} videoUrl={signed.signedUrl} hasAnalysis={!!analysis} />}

      {analysis && (
        <>
          <BigNumber
            label={analysis.coach_overall !== null ? "Score, adjusted by you" : "Score"}
            value={finalScore}
            size="text-[5rem]"
            note={`AI estimate ${analysis.overall}. Automatic and unvalidated: you have the final say.`}
          />
          <form action={setReviewed.bind(null, id, !video.reviewed_at)}>
            <Button type="submit" variant={video.reviewed_at ? "outline" : "primary"} className="w-full">
              {video.reviewed_at ? "Mark as not reviewed" : "Mark as reviewed"}
            </Button>
          </form>
        </>
      )}

      {analysis && <Link href={`/athletes/${video.athlete_id}/compare?b=${id}`} className="text-sm underline">Compare with another clip</Link>}

      <Tabs
        tabs={[
          { key: "scores", label: "Scores", content: scoresTab },
          { key: "moves", label: "Moves", content: movesTab },
          { key: "feedback", label: "Feedback", content: feedbackTab },
          { key: "notes", label: `Notes${(notes ?? []).length ? ` (${notes!.length})` : ""}`, content: notesTab },
        ]}
      />
    </div>
  );
}
