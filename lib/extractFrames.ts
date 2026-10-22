// Runs in the browser. Pulls a handful of still frames out of a video and
// measures simple quality signals (darkness, blur, shakiness) with plain maths.

export const MAX_CLIP_SECONDS = 60;
const FRAME_COUNT = 8;
const SEND_WIDTH = 768; // frames sent to the AI
const THUMB_WIDTH = 240; // frames kept for the evidence card

export type QualityReport = {
  ok: boolean;
  warnings: string[];
  brightness: number; // 0 to 255
  sharpness: number; // higher is sharper
  jitter: number; // average direction change in picture pixels (96px-wide view)
};

export type ExtractedClip = {
  duration: number;
  frames: { timestamp: number; dataUrl: string; thumb: string }[];
  quality: QualityReport;
};

const CANT_READ = "This browser couldn't read the clip. Try Chrome, or an .mp4 or .mov file from your phone.";

function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    // Some browsers (Safari) only load a video that is actually on the page.
    video.style.cssText = "position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    // Never wait forever: if the browser can't decode this file it may send no signal at all.
    const timer = setTimeout(() => fail(CANT_READ), 10000);
    const fail = (message: string) => {
      clearTimeout(timer);
      video.remove();
      reject(new Error(message));
    };
    const ready = () => {
      if (!video.videoWidth || !video.videoHeight) return fail(CANT_READ);
      clearTimeout(timer);
      resolve(video);
    };

    video.onloadedmetadata = () => {
      if (isFinite(video.duration)) return ready();
      // Some screen/browser recordings report an unknown length. Jumping to the
      // far end makes the browser work out the real duration.
      video.ondurationchange = () => {
        if (!isFinite(video.duration)) return;
        video.ondurationchange = null;
        video.currentTime = 0;
        ready();
      };
      video.currentTime = 1e101;
    };
    video.onerror = () => fail("This video couldn't be opened. Try an .mp4 or .mov from your phone.");
    document.body.appendChild(video);
    video.src = URL.createObjectURL(file);
  });
}

function seek(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // A seek to the spot we are already at sends no "seeked" signal, so don't wait for one.
    if (Math.abs(video.currentTime - t) < 0.001) return resolve();
    const timer = setTimeout(() => reject(new Error(CANT_READ)), 8000);
    video.onseeked = () => {
      clearTimeout(timer);
      resolve();
    };
    video.onerror = () => {
      clearTimeout(timer);
      reject(new Error(CANT_READ));
    };
    video.currentTime = t;
  });
}

function drawTo(video: HTMLVideoElement, width: number) {
  const height = Math.round((video.videoHeight / video.videoWidth) * width);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(video, 0, 0, width, height);
  return { canvas, ctx, width, height };
}

// Small greyscale copy used for the quality maths.
function grey(video: HTMLVideoElement): { data: Float32Array; w: number; h: number } {
  const { ctx, width, height } = drawTo(video, 96);
  const px = ctx.getImageData(0, 0, width, height).data;
  const data = new Float32Array(width * height);
  for (let i = 0; i < data.length; i++) {
    data[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
  }
  return { data, w: width, h: height };
}

function mean(a: Float32Array) {
  let s = 0;
  for (const v of a) s += v;
  return s / a.length;
}

// Sharp images have strong edges: the variance of a simple edge filter is high.
function sharpness({ data, w, h }: { data: Float32Array; w: number; h: number }) {
  const edges: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      edges.push(4 * data[i] - data[i - 1] - data[i + 1] - data[i - w] - data[i + w]);
    }
  }
  const m = edges.reduce((a, b) => a + b, 0) / edges.length;
  return edges.reduce((a, b) => a + (b - m) * (b - m), 0) / edges.length;
}

type Grey = { data: Float32Array; w: number; h: number };

// How far did the whole picture slide between two frames? Tries every small
// shift and keeps the one that makes the frames match best.
function shiftBetween(a: Grey, b: Grey): [number, number] {
  const R = 8;
  let best = Infinity;
  let result: [number, number] = [0, 0];
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      let sad = 0;
      for (let y = R; y < a.h - R; y += 2) {
        for (let x = R; x < a.w - R; x += 2) {
          sad += Math.abs(a.data[y * a.w + x] - b.data[(y + dy) * b.w + (x + dx)]);
        }
      }
      if (sad < best) {
        best = sad;
        result = [dx, dy];
      }
    }
  }
  return result;
}

export async function extractFrames(file: File): Promise<ExtractedClip> {
  const video = await loadVideo(file);
  try {
    return await readClip(video);
  } finally {
    URL.revokeObjectURL(video.src);
    video.remove();
  }
}

async function readClip(video: HTMLVideoElement): Promise<ExtractedClip> {
  const duration = video.duration;
  if (!isFinite(duration) || duration <= 0) throw new Error("Couldn't read the length of this video.");
  if (duration > MAX_CLIP_SECONDS) {
    throw new Error(`This clip is ${Math.round(duration)}s long. Please keep it to ${MAX_CLIP_SECONDS}s or less.`);
  }

  const frames: ExtractedClip["frames"] = [];
  const brightnesses: number[] = [];
  const sharpnesses: number[] = [];
  const jitters: number[] = [];

  for (let i = 0; i < FRAME_COUNT; i++) {
    // Spread frames evenly, staying away from the very start and end.
    const t = Math.min(duration - 0.05, ((i + 0.5) / FRAME_COUNT) * duration);
    await seek(video, t);
    const big = drawTo(video, SEND_WIDTH);
    const thumb = drawTo(video, THUMB_WIDTH);
    frames.push({
      timestamp: Math.round(t * 10) / 10,
      dataUrl: big.canvas.toDataURL("image/jpeg", 0.7),
      thumb: thumb.canvas.toDataURL("image/jpeg", 0.6),
    });
    const g = grey(video);
    brightnesses.push(mean(g.data));
    sharpnesses.push(sharpness(g));

    // Shakiness: measure how the picture slides over two 0.1s steps. A steady
    // pan keeps going the same way; shaking changes direction, so the two
    // slides differ a lot.
    if (t + 0.2 < duration) {
      await seek(video, t + 0.1);
      const g2 = grey(video);
      await seek(video, t + 0.2);
      const g3 = grey(video);
      const [ax, ay] = shiftBetween(g, g2);
      const [bx, by] = shiftBetween(g2, g3);
      jitters.push(Math.hypot(bx - ax, by - ay));
    }
  }

  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const brightness = avg(brightnesses);
  const sharp = avg(sharpnesses);
  const jitter = avg(jitters);

  const warnings: string[] = [];
  if (brightness < 55) warnings.push("The footage is very dark.");
  if (sharp < 25) warnings.push("The footage looks blurry or out of focus.");
  if (jitter > 3) warnings.push("The camera looks very shaky or is moving a lot.");

  return {
    duration,
    frames,
    quality: { ok: warnings.length === 0, warnings, brightness, sharpness: sharp, jitter },
  };
}
