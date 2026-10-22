"use client";

import type { Frame, Landmark } from "@/sports/types";

// The pose model is Google's official MediaPipe "pose landmarker (full)", loaded in the browser.
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task";

export type Extracted = { frames: Frame[]; aspect: number; duration: number; cameraSpan: number };

/** Sampling rate: 15 fps for short clips, lower for long ones so analysis stays quick on a phone. */
function sampleFps(duration: number) {
  return duration <= 25 ? 15 : duration <= 45 ? 10 : 7;
}

const TW = 96; // thumbnail size used to track camera movement
type Thumb = { g: Float32Array; h: number };

function thumbOf(video: HTMLVideoElement, th: HTMLCanvasElement): Thumb {
  const c = th.getContext("2d", { willReadFrequently: true })!;
  c.drawImage(video, 0, 0, th.width, th.height);
  const d = c.getImageData(0, 0, th.width, th.height).data;
  const g = new Float32Array(th.width * th.height);
  for (let i = 0; i < g.length; i++) g[i] = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2];
  return { g, h: th.height };
}

/** How far the background moved between two frames (thumbnail pixels). Pixels inside `mask` (the batter) are ignored. */
function backgroundShift(prev: Thumb, cur: Thumb, mask: (x: number, y: number) => boolean) {
  const W = TW, H = cur.h, R = 8, RY = 5;
  let best = { dx: 0, dy: 0, cost: Infinity };
  for (let dy = -RY; dy <= RY; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      let sum = 0, n = 0;
      for (let y = RY; y < H - RY; y++) {
        for (let x = R; x < W - R; x++) {
          if (mask(x, y) || mask(x + dx, y + dy)) continue;
          sum += Math.abs(cur.g[(y + dy) * W + x + dx] - prev.g[y * W + x]);
          n++;
        }
      }
      // tiny bias towards "no movement" so flat, textureless scenes don't invent a pan
      const cost = n > 200 ? sum / n + 0.02 * (Math.abs(dx) + Math.abs(dy)) : Infinity;
      if (cost < best.cost) best = { dx, dy, cost };
    }
  }
  return best;
}

let landmarkerPromise: Promise<import("@mediapipe/tasks-vision").PoseLandmarker> | null = null;

async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe");
      // CPU mode on purpose: MediaPipe's GPU mode silently returns no pose for non-square video frames.
      return PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        runningMode: "IMAGE",
        numPoses: 3,
        minPoseDetectionConfidence: 0.3,
        minPosePresenceConfidence: 0.3,
      });
    })();
    landmarkerPromise.catch(() => (landmarkerPromise = null));
  }
  return landmarkerPromise;
}

function seek(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve, reject) => {
    const done = () => { video.removeEventListener("seeked", done); resolve(); };
    video.addEventListener("seeked", done);
    video.onerror = () => reject(new Error("The video could not be read."));
    video.currentTime = time;
  });
}

/** Walks through the video, runs pose estimation on evenly spaced frames, returns keypoints only. */
export async function extractPose(
  videoUrl: string,
  onProgress: (pct: number, stage: string) => void,
): Promise<Extracted> {
  onProgress(0, "Loading pose model");
  const landmarker = await getLandmarker();

  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = videoUrl;
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("This browser can't play that video format. Try Chrome, or upload an MP4."));
  });

  const duration = video.duration;
  const aspect = video.videoWidth / video.videoHeight;
  const fps = sampleFps(duration);
  const count = Math.max(1, Math.floor(duration * fps));
  const frames: Frame[] = [];
  let cameraSpan = 0;

  // Pose estimation doesn't need 1080p: shrink each frame to 1024px wide first (much faster on phones).
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(1024, video.videoWidth);
  canvas.height = Math.round(canvas.width / aspect);
  const ctx = canvas.getContext("2d", { willReadFrequently: false })!;

  // Several people can be in shot (keeper, other batter, fielders). Start with the biggest person
  // (the batter is normally closest to the camera) then keep following whoever is nearest to where
  // that person was in the previous frame, so we never hop between people.
  let last: { x: number; y: number } | null = null;
  const hipMid = (p: { x: number; y: number }[]) => ({ x: (p[23].x + p[24].x) / 2, y: (p[23].y + p[24].y) / 2 });
  const torso = (p: { x: number; y: number }[]) =>
    Math.hypot((p[11].x + p[12].x) / 2 - (p[23].x + p[24].x) / 2, (p[11].y + p[12].y) / 2 - (p[23].y + p[24].y) / 2);

  // Camera movement: track how the background shifts between sampled frames and subtract the
  // accumulated shift from every keypoint, so a panning or shaky phone doesn't look like the batter moving.
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = TW;
  thumbCanvas.height = Math.round(TW / aspect);
  let prevThumb: Thumb | null = null;
  let prevBox: [number, number, number, number] | null = null;
  let camX = 0, camY = 0, minX = 0, maxX = 0, minY = 0, maxY = 0;

  const boxOf = (p: { x: number; y: number }[]): [number, number, number, number] => {
    const xs = p.map((q) => q.x), ys = p.map((q) => q.y);
    return [Math.min(...xs) - 0.08, Math.min(...ys) - 0.08, Math.max(...xs) + 0.08, Math.max(...ys) + 0.08];
  };

  const detectAt = (t: number) => {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const poses = landmarker.detect(canvas).landmarks;
    let pose = poses[0];
    if (poses.length > 1) {
      pose = last
        ? poses.reduce((best, p) => {
            const d = (q: typeof p) => Math.hypot(hipMid(q).x - last!.x, hipMid(q).y - last!.y);
            return d(p) < d(best) ? p : best;
          })
        : poses.reduce((best, p) => (torso(p) > torso(best) ? p : best));
    }
    if (pose) last = hipMid(pose);

    const thumb = thumbOf(video, thumbCanvas);
    const box = pose ? boxOf(pose) : null;
    if (prevThumb) {
      const inBox = (b: typeof box, x: number, y: number) =>
        !!b && x / TW >= b[0] && x / TW <= b[2] && y / thumb.h >= b[1] && y / thumb.h <= b[3];
      const { dx, dy } = backgroundShift(prevThumb, thumb, (x, y) => inBox(box, x, y) || inBox(prevBox, x, y));
      camX += dx / TW;
      camY += dy / thumb.h;
      minX = Math.min(minX, camX); maxX = Math.max(maxX, camX);
      minY = Math.min(minY, camY); maxY = Math.max(maxY, camY);
    }
    prevThumb = thumb;
    prevBox = box;

    const lm: Landmark[] | null = pose
      ? pose.map((p) => [round(p.x - camX), round(p.y - camY), round(p.visibility ?? 0)] as Landmark)
      : null;
    frames.push({ t: round(t), lm, cam: [round(camX), round(camY)] });
    cameraSpan = Math.max(maxX - minX, maxY - minY);
  };

  if ("requestVideoFrameCallback" in video) {
    // Fast path: play the clip slowly and grab frames as they appear. Seeking is very slow on
    // phone videos (they only store full pictures every second or so), playing is not.
    video.playbackRate = 0.5;
    let next = 0;
    await new Promise<void>((resolve, reject) => {
      const onFrame = (_now: number, meta: VideoFrameCallbackMetadata) => {
        if (meta.mediaTime >= next) {
          detectAt(meta.mediaTime);
          next += 1 / fps;
          if (frames.length % 3 === 0) onProgress(Math.min(99, Math.round((meta.mediaTime / duration) * 100)), "Reading body positions");
        }
        if (video.ended) resolve();
        else video.requestVideoFrameCallback(onFrame);
      };
      video.onended = () => resolve();
      video.onerror = () => reject(new Error("The video could not be read."));
      video.requestVideoFrameCallback(onFrame);
      video.play().catch(reject);
    });
    video.pause();
  } else {
    for (let i = 0; i < count; i++) {
      const t = Math.min(duration - 0.01, i / fps);
      await seek(video, t);
      detectAt(t);
      if (i % 3 === 0) onProgress(Math.round((i / count) * 100), "Reading body positions");
    }
  }
  onProgress(100, "Done");
  return { frames, aspect, duration, cameraSpan };
}

/** Dev helper: timing and detection check at a few moments of a clip. */
export async function probe(videoUrl: string, times: number[]) {
  const landmarker = await getLandmarker();
  const video = document.createElement("video");
  video.muted = true;
  video.src = videoUrl;
  await new Promise<void>((r) => (video.onloadeddata = () => r()));
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = Math.round(1280 / (video.videoWidth / video.videoHeight));
  const ctx = canvas.getContext("2d")!;
  const out: { t: number; seekMs: number; detectMs: number; found: boolean }[] = [];
  for (const t of times) {
    const a = performance.now();
    await seek(video, t);
    const b = performance.now();
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const res = landmarker.detect(canvas);
    out.push({ t, seekMs: Math.round(b - a), detectMs: Math.round(performance.now() - b), found: res.landmarks.length > 0 });
  }
  return out;
}

const round = (n: number) => Math.round(n * 10000) / 10000;
