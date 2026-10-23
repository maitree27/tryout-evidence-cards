"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { extractPose } from "@/lib/pose/extract";
import { createClient } from "@/lib/supabase/client";

type Waiting = { id: string; path: string | null; title: string };

/** Analyses every waiting clip one after another, on this device. Keep the tab open while it runs. */
export function AnalyzeAll({ waiting }: { waiting: Waiting[] }) {
  const router = useRouter();
  const stop = useRef(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState({ index: 0, pct: 0, stage: "" });
  const [problems, setProblems] = useState<string[]>([]);
  const [done, setDone] = useState(0);

  async function run() {
    setBusy(true);
    setProblems([]);
    setDone(0);
    stop.current = false;
    const supabase = createClient();
    const issues: string[] = [];
    let ok = 0;
    for (let i = 0; i < waiting.length; i++) {
      if (stop.current) break;
      const v = waiting[i];
      setNow({ index: i, pct: 0, stage: "Getting ready" });
      try {
        if (!v.path) throw new Error("no video file");
        const { data } = await supabase.storage.from("videos").createSignedUrl(v.path, 3600);
        if (!data?.signedUrl) throw new Error("couldn't open the video");
        const { frames, aspect, cameraSpan } = await extractPose(data.signedUrl, (pct, stage) => setNow({ index: i, pct, stage }));
        setNow({ index: i, pct: 100, stage: "Scoring and writing feedback" });
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ videoId: v.id, aspect, frames, cameraSpan }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((body.warnings && body.warnings[0]) || body.error || "analysis failed");
        ok++;
        setDone(ok);
      } catch (e) {
        issues.push(`${v.title}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }
    setProblems(issues);
    setBusy(false);
    router.refresh();
  }

  if (waiting.length === 0) return null;
  return (
    <section className="tile tile-blue flex flex-col gap-3" aria-label="Analyse waiting clips">
      <div>
        <div className="text-sm opacity-90">{waiting.length} clip{waiting.length === 1 ? "" : "s"} waiting</div>
        <div className="mt-0.5 text-lg font-semibold">Analyse them all in one go</div>
      </div>
      {busy ? (
        <>
          <div className="text-sm">Clip {now.index + 1} of {waiting.length}: {waiting[now.index].title}</div>
          <div className="h-2 overflow-hidden rounded-full bg-black/20"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${now.pct}%` }} /></div>
          <div className="text-xs opacity-90">{now.stage}… keep this tab open</div>
          <Button type="button" variant="outline" onClick={() => { stop.current = true; }} className="self-start border-current">Stop after this clip</Button>
        </>
      ) : (
        <Button type="button" onClick={run} className="self-start">Analyse all</Button>
      )}
      {!busy && done > 0 && <p className="text-sm">Done: {done} analysed.</p>}
      {problems.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-xs">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
      )}
    </section>
  );
}
