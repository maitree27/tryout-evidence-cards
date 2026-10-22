"use client";

// DEV-ONLY test page: runs the full pose + scoring pipeline on the bundled sample clip without logging in.
import { notFound } from "next/navigation";
import { useState } from "react";
import { extractPose, probe } from "@/lib/pose/extract";
import { analyzeBatting } from "@/sports/cricket/batting";

export default function Lab() {
  if (process.env.NODE_ENV === "production") notFound();
  const [log, setLog] = useState("idle");
  const [out, setOut] = useState("");

  async function runProbe() {
    const r = await probe(location.hash === "#kids" ? "/demo/kids1.webm" : "/dev-sample.webm", [0.5, 2, 4, 6, 8]);
    setLog("probe " + JSON.stringify(r));
  }

  async function run() {
    try {
      const t0 = performance.now();
      const ex = await extractPose("/dev-sample.webm", (p, s) => setLog(`${s} ${p}%`));
      const res = analyzeBatting(ex.frames, ex.aspect, "right", "forward_defence");
      setLog(`done in ${((performance.now() - t0) / 1000).toFixed(1)}s, ${ex.frames.length} frames, ${ex.duration.toFixed(1)}s clip`);
      setOut(JSON.stringify(res, null, 1));
      (window as unknown as { __res: unknown }).__res = { res, frames: ex.frames };
    } catch (e) {
      setLog("ERROR " + (e instanceof Error ? e.message : String(e)));
    }
  }
  return (
    <div className="p-4">
      <button id="run" onClick={run} className="rounded bg-primary px-4 py-2 text-white">Run analysis on sample</button>
      <button id="probe" onClick={runProbe} className="ml-2 rounded border px-4 py-2">Probe</button>
      <p id="log" className="my-2 font-mono text-sm">{log}</p>
      <pre id="out" className="text-xs">{out}</pre>
    </div>
  );
}
