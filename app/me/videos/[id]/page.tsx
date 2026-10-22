import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalyzeVideo } from "@/components/analyze-video";
import { FeedbackText } from "@/components/feedback-text";
import { SkeletonVideo } from "@/components/skeleton-video";
import { Badge, Card } from "@/components/ui/card";
import { effectiveScore } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";
import { shotLabel } from "@/sports/cricket/shots";
import type { MetricResult } from "@/sports/types";

// The athlete's view of one clip: read-only scores (coach adjustments win), feedback, and notes the coach chose to share.
export default async function AthleteVideo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: video } = await supabase.from("videos").select("*").eq("id", id).maybeSingle();
  if (!video) notFound();

  const signed = video.storage_path ? (await supabase.storage.from("videos").createSignedUrl(video.storage_path, 3600)).data : null;
  const [{ data: analysis }, { data: overrideRows }, { data: notes }] = await Promise.all([
    supabase.from("analyses").select("*").eq("video_id", id).maybeSingle(),
    supabase.from("score_overrides").select("metric_key, coach_score").eq("video_id", id),
    supabase.from("coach_notes").select("id, body, created_at").eq("video_id", id).order("created_at", { ascending: false }),
  ]);
  const overrides = Object.fromEntries((overrideRows ?? []).map((r) => [r.metric_key, Number(r.coach_score)]));
  const metrics = (analysis?.metrics ?? []) as MetricResult[];
  const keypointsPath = video.storage_path?.replace(/\.[^./]+$/, ".keypoints.json");
  const keypointsUrl = analysis && keypointsPath ? (await supabase.storage.from("videos").createSignedUrl(keypointsPath, 3600)).data?.signedUrl ?? null : null;
  const warnings: string[] = analysis?.quality?.warnings ?? [];

  return (
    <>
      <Link href="/me" className="text-sm text-primary underline">← Your sessions</Link>
      <h1 className="text-4xl">{shotLabel(video.shot_type)}</h1>
      <div className="flex gap-2 text-sm text-muted"><span>{video.taken_on}</span><Badge>{video.status}</Badge></div>

      {signed?.signedUrl && <SkeletonVideo src={signed.signedUrl} keypointsUrl={keypointsUrl} />}
      {signed?.signedUrl && <AnalyzeVideo videoId={id} videoUrl={signed.signedUrl} hasAnalysis={!!analysis} />}

      {analysis && (
        <>
          <Card className="flex items-center gap-4">
            <div className="font-display text-6xl">{analysis.coach_overall ?? analysis.overall}</div>
            <div className="text-sm">
              <div className="font-medium">Overall score (0-100){analysis.coach_overall !== null && " · adjusted by your coach"}</div>
              <div className="text-muted">An automatic estimate from video. Your coach has the final say.</div>
            </div>
          </Card>
          {warnings.length > 0 && (
            <Card className="border-warning text-sm text-warning">
              <ul className="list-disc space-y-1 pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </Card>
          )}
          <Card>
            <h2 className="mb-3">Score breakdown</h2>
            <ul className="space-y-3">
              {metrics.map((m) => {
                const score = effectiveScore(m, overrides);
                return (
                  <li key={m.key}>
                    <div className="flex justify-between text-sm"><span className="font-medium">{m.label}</span><span>{score === null ? "not measured" : `${score}/100`}</span></div>
                    <div className="my-1 h-2 bg-black/10"><div className={overrides[m.key] !== undefined ? "h-full bg-accent" : "h-full bg-primary"} style={{ width: `${score ?? 0}%` }} /></div>
                    <p className="text-xs text-muted">{m.detail}</p>
                  </li>
                );
              })}
            </ul>
          </Card>
          {analysis.feedback && (
            <Card>
              <h2 className="mb-3">Feedback</h2>
              <FeedbackText text={analysis.feedback} />
            </Card>
          )}
        </>
      )}

      {(notes ?? []).length > 0 && (
        <Card>
          <h2 className="mb-3">From your coach</h2>
          <ul className="space-y-2 text-sm">{notes!.map((n) => <li key={n.id} className="border-l-4 border-accent bg-black/5 p-3">{n.body}</li>)}</ul>
        </Card>
      )}
    </>
  );
}
