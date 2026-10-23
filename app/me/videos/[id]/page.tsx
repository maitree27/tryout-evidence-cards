import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalyzeVideo } from "@/components/analyze-video";
import { BigNumber } from "@/components/aura/parts";
import { Tabs } from "@/components/aura/tabs";
import { FeedbackText } from "@/components/feedback-text";
import { SkeletonVideo } from "@/components/skeleton-video";
import { Badge, Card } from "@/components/ui/card";
import { effectiveScore } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";
import { shotLabel } from "@/sports/cricket/shots";
import type { MetricResult } from "@/sports/types";

// The student's view of one clip: read-only scores (coach adjustments win), feedback, and notes the coach chose to share.
export default async function StudentVideo({ params }: { params: Promise<{ id: string }> }) {
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

  const scoresTab = analysis ? (
    <>
      {warnings.length > 0 && (
        <Card className="text-sm text-warning">
          <ul className="list-disc space-y-1 pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </Card>
      )}
      <Card>
        <ul className="space-y-4">
          {metrics.map((m) => {
            const score = effectiveScore(m, overrides);
            return (
              <li key={m.key}>
                <div className="flex justify-between text-sm"><span className="font-medium">{m.label}</span><span>{score === null ? "not measured" : `${score}/100`}</span></div>
                <div className="my-1 h-2 overflow-hidden rounded-full bg-foreground/10"><div className={overrides[m.key] !== undefined ? "h-full bg-warning" : "h-full bg-success"} style={{ width: `${score ?? 0}%` }} /></div>
                <p className="text-xs text-muted">{m.detail}</p>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  ) : (
    <Card className="text-sm text-muted">Tap “Analyse this video” above to get your scores and feedback.</Card>
  );

  const feedbackTab = analysis?.feedback ? (
    <Card><FeedbackText text={analysis.feedback} /></Card>
  ) : (
    <Card className="text-sm text-muted">Feedback appears here after your clip is analysed.</Card>
  );

  const coachTab = (notes ?? []).length > 0 ? (
    <ul className="flex flex-col gap-2 text-sm">
      {notes!.map((n) => <li key={n.id} className="glass border-l-4 border-l-accent p-4">{n.body}</li>)}
    </ul>
  ) : (
    <Card className="text-sm text-muted">Your coach hasn&apos;t shared a note on this clip yet.</Card>
  );

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-5 pt-6">
      <Link href="/me/clips" className="text-sm text-muted hover:text-foreground">← Clips</Link>
      <div>
        <h1 className="text-3xl">{shotLabel(video.shot_type)}</h1>
        <div className="mt-2 flex items-center gap-2 text-sm text-muted"><span>{video.taken_on}</span><Badge>{video.status}</Badge></div>
      </div>

      {signed?.signedUrl && <SkeletonVideo src={signed.signedUrl} keypointsUrl={keypointsUrl} />}
      {signed?.signedUrl && <AnalyzeVideo videoId={id} videoUrl={signed.signedUrl} hasAnalysis={!!analysis} />}

      {analysis && (
        <BigNumber
          label={analysis.coach_overall !== null ? "Score, adjusted by your coach" : "Score"}
          value={analysis.coach_overall ?? analysis.overall}
          size="text-[5rem]"
          note="An automatic estimate from video. Your coach has the final say."
        />
      )}

      <Tabs
        tabs={[
          { key: "scores", label: "Scores", content: scoresTab },
          { key: "feedback", label: "Feedback", content: feedbackTab },
          { key: "coach", label: "From coach", content: coachTab },
        ]}
      />
    </div>
  );
}
