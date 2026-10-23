"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { extractPose } from "@/lib/pose/extract";

export function AnalyzeVideo({ videoId, videoUrl, hasAnalysis }: { videoId: string; videoUrl: string; hasAnalysis: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string[]>();

  async function run() {
    setBusy(true);
    setError(undefined);
    try {
      // 1. Body positions are read on this device. The video itself isn't re-uploaded.
      const { frames, aspect, cameraSpan } = await extractPose(videoUrl, (p, s) => { setPct(p); setStage(s); });
      // 2. The server scores them and writes the feedback.
      setStage("Scoring and writing feedback");
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoId, aspect, frames, cameraSpan }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.warnings ?? [body.error ?? "Analysis failed. Please try again."]);
      } else {
        router.refresh();
      }
    } catch (e) {
      setError([e instanceof Error ? e.message : "Analysis failed. Please try again."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={run} disabled={busy}>
        {busy ? "Analysing…" : hasAnalysis ? "Re-run analysis" : "Analyse this video"}
      </Button>
      {busy && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full bg-success transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted">{stage}… keep this tab open (about 1 minute per 10 seconds of video)</p>
        </div>
      )}
      {error && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-danger">
          {error.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
    </div>
  );
}
