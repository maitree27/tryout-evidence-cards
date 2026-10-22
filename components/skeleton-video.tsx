"use client";

import { useEffect, useRef, useState } from "react";
import type { Frame } from "@/sports/types";

// Pairs of MediaPipe pose landmarks to join with lines (body, arms, legs).
const BONES: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [29, 31], [28, 30], [30, 32], [0, 11], [0, 12],
];
const MIN_VIS = 0.5;

type Keypoints = { aspect: number; frames: Frame[] };

export function SkeletonVideo({ src, keypointsUrl }: { src: string; keypointsUrl: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<Keypoints | null>(null);
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!keypointsUrl) return;
    let cancelled = false;
    fetch(keypointsUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j?.frames) setData(j); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [keypointsUrl]);

  useEffect(() => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    let raf = 0;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const cw = video.clientWidth, ch = video.clientHeight;
      if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      if (!show || !data || !video.videoWidth) return;

      // The video is letterboxed inside its element, so work out where the picture really is.
      const scale = Math.min(cw / video.videoWidth, ch / video.videoHeight);
      const w = video.videoWidth * scale, h = video.videoHeight * scale;
      const ox = (cw - w) / 2, oy = (ch - h) / 2;

      // Nearest analysed frame to the current playback time (ignore if more than 0.2s away).
      const t = video.currentTime;
      let best: Frame | null = null;
      for (const f of data.frames) if (!best || Math.abs(f.t - t) < Math.abs(best.t - t)) best = f;
      if (!best?.lm || Math.abs(best.t - t) > 0.2) return;

      const [cx, cy] = best.cam ?? [0, 0];
      const pt = (i: number) => ({ x: ox + (best!.lm![i][0] + cx) * w, y: oy + (best!.lm![i][1] + cy) * h, ok: best!.lm![i][2] >= MIN_VIS });

      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(34,197,94,0.95)";
      for (const [a, b] of BONES) {
        const p = pt(a), q = pt(b);
        if (!p.ok || !q.ok) continue;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
      ctx.fillStyle = "#facc15";
      for (let i = 0; i < 33; i++) {
        if (i >= 1 && i <= 10) continue; // skip the many face points
        const p = pt(i);
        if (!p.ok) continue;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
      }
    };

    const loop = () => { draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [data, show]);

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-ui bg-black">
        <video ref={videoRef} src={src} controls playsInline className="max-h-[70vh] w-full" />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>
      {keypointsUrl ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          Show body outline {data ? "" : "(loading…)"}
        </label>
      ) : (
        <p className="text-xs text-muted">Body outline appears here after you analyse the video.</p>
      )}
    </div>
  );
}
