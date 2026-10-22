import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalyzeVideo } from "@/components/analyze-video";
import { FeedbackText } from "@/components/feedback-text";
import { Badge, Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { MetricResult } from "@/sports/types";
import { shotLabel } from "@/sports/cricket/shots";

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: video } = await supabase
    .from("videos")
    .select("*, athletes(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!video) notFound();

  // Videos are private: the only way to watch is a link that expires in an hour.
  const { data: signed } = await supabase.storage.from("videos").createSignedUrl(video.storage_path, 3600);

  const { data: analysis } = await supabase.from("analyses").select("*").eq("video_id", id).maybeSingle();
  const metrics = (analysis?.metrics ?? []) as MetricResult[];
  const warnings: string[] = analysis?.quality?.warnings ?? [];

  return (
    <div className="space-y-4">
      <Link href={`/athletes/${video.athletes.id}`} className="text-sm text-primary underline">
        ← {video.athletes.name}
      </Link>
      <h1 className="text-2xl font-semibold">{shotLabel(video.shot_type)}</h1>
      <div className="flex gap-2 text-sm text-muted">
        <span>{video.taken_on}</span>
        <Badge>{video.status}</Badge>
      </div>
      <Card className="p-0 overflow-hidden">
        {signed?.signedUrl ? (
          <video src={signed.signedUrl} controls playsInline className="max-h-[70vh] w-full bg-black" />
        ) : (
          <p className="p-4 text-sm text-danger">Couldn&apos;t load the video.</p>
        )}
      </Card>
      {signed?.signedUrl && <AnalyzeVideo videoId={id} videoUrl={signed.signedUrl} hasAnalysis={!!analysis} />}
      {analysis && (
        <>
          <Card className="flex items-center gap-4">
            <div className="text-4xl font-bold">{analysis.overall}</div>
            <div className="text-sm">
              <div className="font-medium">Overall score (0-100)</div>
              <div className="text-muted">Automatic estimate. Scoring rules are unvalidated heuristics: the coach has the final say.</div>
            </div>
          </Card>
          {warnings.length > 0 && (
            <Card className="border-warning text-sm text-warning">
              <ul className="list-disc space-y-1 pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </Card>
          )}
          <Card>
            <h2 className="mb-3 font-medium">Score breakdown</h2>
            <ul className="space-y-3">
              {metrics.map((m) => (
                <li key={m.key}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{m.label}</span>
                    <span>{m.reliable ? `${m.score}/100` : "not measured"}</span>
                  </div>
                  <div className="my-1 h-2 overflow-hidden rounded-full bg-black/10">
                    <div className="h-full bg-primary" style={{ width: `${m.score ?? 0}%` }} />
                  </div>
                  <p className="text-xs text-muted">{m.detail}</p>
                </li>
              ))}
            </ul>
          </Card>
          {analysis.feedback && (
            <Card>
              <h2 className="mb-3 font-medium">Coaching feedback</h2>
              <FeedbackText text={analysis.feedback} />
              <p className="mt-3 text-xs text-muted">Written by {analysis.feedback_model} from the measurements above.</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
