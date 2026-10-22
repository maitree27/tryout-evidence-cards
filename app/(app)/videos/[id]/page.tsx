import Link from "next/link";
import { notFound } from "next/navigation";
import { addNote, deleteNote, setReviewed } from "@/app/actions/review";
import { AnalyzeVideo } from "@/components/analyze-video";
import { FeedbackText } from "@/components/feedback-text";
import { ScoreEditor } from "@/components/score-editor";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";
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
    supabase.from("coach_notes").select("id, body, created_at").eq("video_id", id).order("created_at", { ascending: false }),
  ]);
  const metrics = (analysis?.metrics ?? []) as MetricResult[];
  const overrides = Object.fromEntries((overrideRows ?? []).map((r) => [r.metric_key, Number(r.coach_score)]));
  const warnings: string[] = analysis?.quality?.warnings ?? [];
  const finalScore = analysis?.coach_overall ?? analysis?.overall;

  return (
    <div className="space-y-4">
      <Link href={`/athletes/${video.athletes.id}`} className="text-sm text-primary underline">← {video.athletes.name}</Link>
      <h1 className="text-2xl font-semibold">{shotLabel(video.shot_type)}</h1>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>{video.taken_on}</span>
        <Badge>{video.status}</Badge>
        {video.reviewed_at ? <Badge tone="good">reviewed</Badge> : <Badge tone="warn">not reviewed</Badge>}
      </div>

      {signed?.signedUrl ? (
        <Card className="overflow-hidden p-0">
          <video src={signed.signedUrl} controls playsInline className="max-h-[70vh] w-full bg-black" />
        </Card>
      ) : (
        <Card className="text-sm text-muted">{video.storage_path ? "Couldn't load the video." : "This is a demo entry, so there is no video file."}</Card>
      )}

      {signed?.signedUrl && <AnalyzeVideo videoId={id} videoUrl={signed.signedUrl} hasAnalysis={!!analysis} />}

      {analysis && (
        <>
          <Card className="flex items-center gap-4">
            <div className="text-4xl font-bold">{finalScore}</div>
            <div className="text-sm">
              <div className="font-medium">Overall score (0-100){analysis.coach_overall !== null && " · adjusted by you"}</div>
              <div className="text-muted">
                AI estimate: {analysis.overall}. Scoring rules are unvalidated heuristics, so the coach has the final say.
              </div>
            </div>
          </Card>
          {warnings.length > 0 && (
            <Card className="border-warning text-sm text-warning">
              <ul className="list-disc space-y-1 pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </Card>
          )}
          <Card>
            <h2 className="mb-3 font-medium">Score breakdown</h2>
            <ScoreEditor videoId={id} metrics={metrics} overrides={overrides} />
          </Card>
          {analysis.feedback && (
            <Card>
              <h2 className="mb-3 font-medium">Coaching feedback</h2>
              <FeedbackText text={analysis.feedback} />
              <p className="mt-3 text-xs text-muted">Written by {analysis.feedback_model} from the measurements above.</p>
            </Card>
          )}
          <form action={setReviewed.bind(null, id, !video.reviewed_at)}>
            <Button type="submit" variant={video.reviewed_at ? "outline" : "primary"}>
              {video.reviewed_at ? "Mark as not reviewed" : "Mark as reviewed"}
            </Button>
          </form>
        </>
      )}

      <Card>
        <h2 className="mb-3 font-medium">Your notes on this video</h2>
        <form action={addNote.bind(null, video.athletes.id, id)} className="space-y-2">
          <Textarea name="body" required placeholder="What did you notice? What should they work on?" />
          <Button type="submit" variant="outline">Add note</Button>
        </form>
        <ul className="mt-4 space-y-2">
          {(notes ?? []).map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-2 rounded-ui bg-black/5 p-3 text-sm">
              <div>
                <p>{n.body}</p>
                <p className="mt-1 text-xs text-muted">{new Date(n.created_at).toLocaleDateString()}</p>
              </div>
              <form action={deleteNote.bind(null, n.id, video.athletes.id, id)}>
                <Button variant="ghost" type="submit" className="min-h-8 px-2 text-xs">Delete</Button>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
