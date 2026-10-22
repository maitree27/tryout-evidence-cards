// Cricket batting analysis: turns pose keypoints (from MediaPipe) into 9 scored metrics.
//
// IMPORTANT: every threshold below is a first-pass heuristic chosen from general coaching
// principles, NOT validated against real coach scores. See "Calibration" in CLAUDE.md.
// Assumes a side-on camera, held steady, one batter in frame.
//
// Coordinates: all distances are in "torso lengths" (shoulder-midpoint to hip-midpoint),
// so results don't depend on how far away the camera is. x is flipped so that +x always
// points towards the bowler; y points down (smaller y = higher).

import { clamp, mean, median, rangeScore, smooth3, std, trapezoid } from "@/lib/analysis/geometry";
import { shotProfile } from "@/sports/cricket/shots";
import type { AnalysisResult, Frame, Landmark, MetricResult } from "@/sports/types";

export const CONFIG_VERSION = "cricket-batting-0.1";

const LM = {
  nose: 0, lEar: 7, rEar: 8, lShoulder: 11, rShoulder: 12, lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28,
} as const;

const MIN_VIS = 0.5;
const MIN_RELIABLE_FRACTION = 0.6;

type Pt = { x: number; y: number };

export type MetricDef = {
  key: string;
  label: string;
  unit: string;
  weight: number;
  ideal: string;
  /** Plain-English meaning, also given to the AI so it never has to guess. */
  meaning: string;
};

/** Metric catalogue. Weights sum to 1. Editable without touching the maths below. */
export const BATTING_METRICS: MetricDef[] = [
  { key: "stance_balance", label: "Stance balance", unit: "torso lengths", weight: 0.12, ideal: "Hips centred between the feet at set-up (offset under 0.1)", meaning: "How far the hips sit off-centre from the feet before the shot starts" },
  { key: "head_stillness", label: "Head stillness", unit: "torso lengths", weight: 0.15, ideal: "Head steady while the shot develops (movement under 0.03)", meaning: "How much the head bobs or wanders from set-up to contact" },
  { key: "head_over_knee", label: "Head over front knee", unit: "torso lengths", weight: 0.12, ideal: "Head over or just ahead of the front knee at contact (within 0.1)", meaning: "Horizontal gap between the head and the front knee at the moment of contact" },
  { key: "backlift", label: "Backlift height", unit: "hip-to-shoulder scale (0 = hip, 1 = shoulder)", weight: 0.08, ideal: "Hands lift to about waist-to-shoulder height (0.6-1.2)", meaning: "How high the hands get at the top of the backlift" },
  { key: "swing_path", label: "Bat swing path", unit: "directness (1 = straight line)", weight: 0.12, ideal: "A smooth, fairly direct downswing (0.75 or more)", meaning: "How smooth and direct the hands travel from top of backlift to contact (proxy for bat path; the bat itself is not tracked)" },
  { key: "footwork", label: "Footwork", unit: "torso lengths", weight: 0.12, ideal: "Front-foot movement matching the shot type", meaning: "How far the front foot travels from set-up to contact" },
  { key: "weight_transfer", label: "Weight transfer", unit: "torso lengths", weight: 0.10, ideal: "Hips moving towards the ball as the shot type needs", meaning: "How far the hips shift towards the bowler from set-up to contact" },
  { key: "timing", label: "Timing", unit: "seconds", weight: 0.12, ideal: "Contact 0-0.2s after the front foot lands", meaning: "Gap between the front foot landing and the bat reaching contact (positive = bat arrives after foot lands)" },
  { key: "follow_through", label: "Follow-through", unit: "torso lengths", weight: 0.07, ideal: "Hands finishing as the shot type needs (high for drives)", meaning: "How far the hands rise after contact" },
];

function emptyResult(warnings: string[], total: number, withPose: number): AnalysisResult {
  return {
    configVersion: CONFIG_VERSION,
    overall: null,
    metrics: BATTING_METRICS.map((m) => ({
      key: m.key, label: m.label, raw: null, unit: m.unit, score: null, reliable: false,
      detail: "Not measured", ideal: m.ideal, weight: m.weight,
    })),
    quality: { framesTotal: total, framesWithPose: withPose, poseCoverage: total ? withPose / total : 0, warnings, events: null },
  };
}

/**
 * @param frames sampled frames (time-ordered) with pose landmarks
 * @param aspect video width / height (needed because landmark x and y are fractions of different lengths)
 * @param hand batter's hand, decides which foot is the front foot
 */
export function analyzeBatting(
  frames: Frame[],
  aspect: number,
  hand: "right" | "left",
  shotType: string,
): AnalysisResult {
  const profile = shotProfile(shotType);
  const warnings: string[] = [];

  const visibleCore = (lm: Landmark[]) =>
    [LM.lShoulder, LM.rShoulder, LM.lHip, LM.rHip].every((i) => lm[i]?.[2] >= MIN_VIS);
  const fs = frames.filter((f) => f.lm && f.lm.length >= 33 && visibleCore(f.lm));
  const coverage = frames.length ? fs.length / frames.length : 0;

  if (fs.length < 8) {
    return emptyResult(
      ["Could not see the batter clearly enough (fewer than 8 usable frames). Film side-on, in good light, with the whole body in frame."],
      frames.length, fs.length,
    );
  }
  if (coverage < 0.7) warnings.push(`The batter was only detected in ${Math.round(coverage * 100)}% of frames, so some results may be unreliable.`);

  const raw = (f: Frame, i: number): Pt => ({ x: f.lm![i][0] * aspect, y: f.lm![i][1] });
  const mid = (f: Frame, a: number, b: number): Pt => {
    const p = raw(f, a), q = raw(f, b);
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  };
  // A landmark only counts if the model is confident AND it is inside the frame. Parts cut off at the
  // edge (e.g. head above the top) are guesses, so they are treated as not seen.
  const EDGE = 0.01;
  const seen = (l: Landmark | undefined) =>
    !!l && l[2] >= MIN_VIS && l[0] > EDGE && l[0] < 1 - EDGE && l[1] > EDGE && l[1] < 1 - EDGE;
  const vis = (f: Frame, ids: number[]) => ids.every((i) => seen(f.lm![i]));

  // Body scale: median torso length.
  const L = median(fs.map((f) => {
    const s = mid(f, LM.lShoulder, LM.rShoulder), h = mid(f, LM.lHip, LM.rHip);
    return Math.hypot(s.x - h.x, s.y - h.y);
  }));
  if (!(L > 0.02)) {
    return emptyResult(["The batter looks too small in the frame. Film closer, or zoom in."], frames.length, fs.length);
  }

  const frontSide = hand === "right" ? "l" : "r";
  const rearSide = hand === "right" ? "r" : "l";
  const I = (side: string, part: "Ankle" | "Knee" | "Wrist" | "Ear") => LM[`${side}${part}` as keyof typeof LM];

  // Which way is the bowler? The batter's head turns towards the bowler, so the nose sits ahead of the ears.
  const noseDir = fs
    .filter((f) => vis(f, [LM.nose, LM.lEar, LM.rEar]))
    .map((f) => raw(f, LM.nose).x - (raw(f, LM.lEar).x + raw(f, LM.rEar).x) / 2);
  let facing: 1 | -1;
  if (noseDir.length >= 5 && Math.abs(median(noseDir)) > 0.003) {
    facing = median(noseDir) >= 0 ? 1 : -1;
  } else {
    const d = fs.map((f) => raw(f, I(frontSide, "Ankle")).x - raw(f, I(rearSide, "Ankle")).x);
    facing = median(d) >= 0 ? 1 : -1;
    warnings.push("Couldn't tell which way the batter faces from the head, so direction was inferred from the feet.");
  }
  const P = (f: Frame, i: number): Pt => {
    const p = raw(f, i);
    return { x: (facing * p.x) / L, y: p.y / L };
  };
  const M = (f: Frame, a: number, b: number): Pt => {
    const p = P(f, a), q = P(f, b);
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  };

  const n = fs.length;
  const t = fs.map((f) => f.t);
  const dt = (i: number) => Math.max(1e-3, t[i] - t[i - 1]);

  // Hand (wrist-midpoint) path and speed.
  const wx = smooth3(fs.map((f) => M(f, LM.lWrist, LM.rWrist).x));
  const wy = smooth3(fs.map((f) => M(f, LM.lWrist, LM.rWrist).y));
  const wristOk = fs.map((f) => vis(f, [LM.lWrist, LM.rWrist]));
  const speed = smooth3(wx.map((_, i) => (i === 0 ? 0 : Math.hypot(wx[i] - wx[i - 1], wy[i] - wy[i - 1]) / dt(i))));

  let contact = 0;
  speed.forEach((s, i) => { if (s > speed[contact]) contact = i; });
  const peak = speed[contact];
  const swingFound = peak >= 2; // torso lengths per second
  if (!swingFound) warnings.push("No clear bat swing was found in this clip (hands barely moved). Timing, swing and follow-through are not scored.");

  let setupEnd = 2;
  for (let i = 0; i < contact; i++) { if (speed[i] > 0.25 * peak) { setupEnd = Math.max(2, i); break; } }
  setupEnd = Math.min(setupEnd, Math.max(2, contact - 1));
  const setupIdx = Array.from({ length: setupEnd }, (_, i) => i);

  let backlift = 0;
  for (let i = 0; i <= contact; i++) { if (wy[i] < wy[backlift]) backlift = i; }

  // Front foot landing: after the fastest front-ankle movement, the first moment it slows right down.
  const fax = fs.map((f) => P(f, I(frontSide, "Ankle")).x);
  const faSpeed = smooth3(fax.map((x, i) => (i === 0 ? 0 : Math.abs(x - fax[i - 1]) / dt(i))));
  let fastest = setupEnd;
  for (let i = setupEnd; i <= Math.min(n - 1, contact + 2); i++) { if (faSpeed[i] > faSpeed[fastest]) fastest = i; }
  let landing = contact;
  for (let i = fastest + 1; i < n; i++) { if (faSpeed[i] < 0.3 * faSpeed[fastest]) { landing = i; break; } }

  // Tell the coach when parts of the body are regularly out of shot.
  const cut = (ids: number[]) => fs.filter((f) => !vis(f, ids)).length / n;
  if (cut([LM.lEar, LM.rEar]) > 0.3) warnings.push("The batter's head is cut off or out of frame in much of the clip, so head metrics were not scored. Leave space above the head.");
  if (cut([LM.lAnkle, LM.rAnkle]) > 0.3) warnings.push("The batter's feet are cut off or out of frame in much of the clip, so foot-based metrics were not scored. Keep the whole body in shot.");

  const frac = (idx: number[], ids: number[]) => (idx.length ? idx.filter((i) => vis(fs[i], ids)).length / idx.length : 0);
  const rangeIdx = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
  const ok = (idx: number[], ids: number[]) => frac(idx, ids) >= MIN_RELIABLE_FRACTION;

  const results: MetricResult[] = [];
  const add = (key: string, rawVal: number | null, score: number | null, reliable: boolean, detail: string) => {
    const def = BATTING_METRICS.find((m) => m.key === key)!;
    const good = reliable && rawVal !== null && Number.isFinite(rawVal) && score !== null;
    results.push({
      key, label: def.label, unit: def.unit, ideal: def.ideal, weight: def.weight,
      raw: good ? Math.round(rawVal! * 1000) / 1000 : null,
      score: good ? Math.round(clamp(score!)) : null,
      reliable: good,
      detail: good ? detail : "Could not be measured reliably from this clip",
    });
  };

  const ankleIds = [LM.lAnkle, LM.rAnkle];
  const setupFront = (fn: (f: Frame) => number) => median(setupIdx.map((i) => fn(fs[i])));

  // 1. Stance balance
  {
    const ids = [LM.lHip, LM.rHip, ...ankleIds];
    const off = Math.abs(setupFront((f) => M(f, LM.lHip, LM.rHip).x - M(f, LM.lAnkle, LM.rAnkle).x));
    add("stance_balance", off, trapezoid(off, -1, -0.001, 0.1, 0.5), ok(setupIdx, ids),
      `At set-up the hips sat ${off.toFixed(2)} torso-lengths off-centre from the feet.`);
  }

  // 2. Head stillness (set-up to contact): vertical bob plus sideways wobble after removing steady forward drift
  {
    const ids = [LM.lEar, LM.rEar];
    const idx = rangeIdx(0, contact);
    const hx = idx.map((i) => M(fs[i], LM.lEar, LM.rEar).x);
    const hy = idx.map((i) => M(fs[i], LM.lEar, LM.rEar).y);
    const ti = idx.map((i) => t[i]);
    const tm = mean(ti), xm = mean(hx);
    const slope = ti.reduce((a, v, k) => a + (v - tm) * (hx[k] - xm), 0) / Math.max(1e-6, ti.reduce((a, v) => a + (v - tm) ** 2, 0));
    const resid = hx.map((v, k) => v - (xm + slope * (ti[k] - tm)));
    const movement = Math.sqrt(std(hy) ** 2 + std(resid) ** 2);
    add("head_stillness", movement, trapezoid(movement, -1, -0.001, 0.03, 0.15), ok(idx, ids),
      `Head movement from set-up to contact measured ${movement.toFixed(3)} torso-lengths (lower is steadier).`);
  }

  // 3. Head over front knee at contact
  {
    const ids = [LM.lEar, LM.rEar, I(frontSide, "Knee")];
    const idx = rangeIdx(Math.max(0, contact - 1), Math.min(n - 1, contact + 1));
    const off = median(idx.map((i) => M(fs[i], LM.lEar, LM.rEar).x - P(fs[i], I(frontSide, "Knee")).x));
    const score = trapezoid(off, -0.6, -0.1, 0.25, 0.8);
    const where = off > 0.1 ? "ahead of" : off < -0.1 ? "behind" : "over";
    add("head_over_knee", off, score, swingFound && ok(idx, ids),
      `At contact the head was ${Math.abs(off).toFixed(2)} torso-lengths ${where} the front knee.`);
  }

  // 4. Backlift height (0 = hip height, 1 = shoulder height)
  {
    const ids = [LM.lWrist, LM.rWrist, LM.lShoulder, LM.rShoulder, LM.lHip, LM.rHip];
    const hipY = M(fs[backlift], LM.lHip, LM.rHip).y;
    const shY = M(fs[backlift], LM.lShoulder, LM.rShoulder).y;
    const h = (hipY - wy[backlift]) / Math.max(0.2, hipY - shY);
    add("backlift", h, trapezoid(h, 0.1, 0.6, 1.2, 1.8), swingFound && ok([backlift], ids),
      `At the top of the backlift the hands reached ${h.toFixed(2)} on a scale where 0 is hip height and 1 is shoulder height.`);
  }

  // 5. Swing path: straight-line distance / path length from top of backlift to contact
  {
    const idx = rangeIdx(backlift, contact);
    let path = 0;
    for (let i = backlift + 1; i <= contact; i++) path += Math.hypot(wx[i] - wx[i - 1], wy[i] - wy[i - 1]);
    const direct = Math.hypot(wx[contact] - wx[backlift], wy[contact] - wy[backlift]);
    const d = path > 0.05 ? direct / path : NaN;
    add("swing_path", d, trapezoid(d, 0.2, 0.75, 1.01, 2), swingFound && idx.length >= 3 && Number.isFinite(d) && idx.every((i) => wristOk[i]) ,
      `From top of backlift to contact the hands travelled ${(d * 100).toFixed(0)}% as directly as a straight line.`);
  }

  // 6. Footwork: front-foot travel from set-up to contact
  {
    const ids = [I(frontSide, "Ankle")];
    const base = median(setupIdx.map((i) => P(fs[i], I(frontSide, "Ankle")).x));
    const stride = Math.max(...rangeIdx(landing, Math.min(n - 1, Math.max(landing, contact))).map((i) => P(fs[i], I(frontSide, "Ankle")).x - base)) ;
    const strideAtContact = P(fs[contact], I(frontSide, "Ankle")).x - base;
    const s = Number.isFinite(stride) ? Math.min(stride, strideAtContact + 0.1) : strideAtContact;
    const r = profile.stride;
    add("footwork", s, rangeScore(s, r.lo, r.hi, r.tol), swingFound && ok(rangeIdx(0, contact), ids),
      `The front foot moved ${s.toFixed(2)} torso-lengths towards the bowler (ideal for a ${profile.label.toLowerCase()}: ${r.lo} to ${r.hi}).`);
  }

  // 7. Weight transfer: hip shift towards bowler
  {
    const ids = [LM.lHip, LM.rHip];
    const base = median(setupIdx.map((i) => M(fs[i], LM.lHip, LM.rHip).x));
    const shift = M(fs[contact], LM.lHip, LM.rHip).x - base;
    const r = profile.hipShift;
    add("weight_transfer", shift, rangeScore(shift, r.lo, r.hi, r.tol), swingFound && ok(rangeIdx(0, contact), ids),
      `The hips moved ${shift.toFixed(2)} torso-lengths towards the bowler (ideal for a ${profile.label.toLowerCase()}: ${r.lo} to ${r.hi}).`);
  }

  // 8. Timing: bat contact relative to front-foot landing
  {
    const gap = t[contact] - t[landing];
    add("timing", gap, trapezoid(gap, -0.3, 0, 0.2, 0.6), swingFound && ok(rangeIdx(0, contact), [I(frontSide, "Ankle")]),
      gap >= 0
        ? `The bat reached contact ${gap.toFixed(2)}s after the front foot landed.`
        : `The bat reached contact ${Math.abs(gap).toFixed(2)}s before the front foot landed (swinging while still moving).`);
  }

  // 9. Follow-through: how far hands rise after contact
  {
    const after = rangeIdx(contact, Math.min(n - 1, contact + Math.max(3, Math.round(0.8 / (median(t.slice(1).map((v, i) => v - t[i])) || 0.067)))));
    const rise = wy[contact] - Math.min(...after.map((i) => wy[i]));
    const r = profile.followRise;
    add("follow_through", rise, rangeScore(rise, r.lo, r.hi, r.tol), swingFound && after.length >= 3 && after.every((i) => wristOk[i]),
      `After contact the hands rose ${rise.toFixed(2)} torso-lengths (ideal for a ${profile.label.toLowerCase()}: ${r.lo} to ${r.hi}).`);
  }

  // Overall: weighted average of the metrics that could be measured.
  const used = results.filter((r) => r.reliable);
  const wsum = used.reduce((a, r) => a + r.weight, 0);
  let overall: number | null = used.length >= 4
    ? Math.round(used.reduce((a, r) => a + r.score! * r.weight, 0) / wsum)
    : null;
  if (overall === null) warnings.push("Fewer than 4 metrics could be measured, so no overall score was given.");
  else if (used.length < results.length) warnings.push(`${results.length - used.length} metric(s) could not be measured and are left out of the overall score.`);

  return {
    configVersion: CONFIG_VERSION,
    overall,
    metrics: results,
    quality: {
      framesTotal: frames.length,
      framesWithPose: fs.length,
      poseCoverage: Math.round(coverage * 100) / 100,
      warnings,
      events: { setupEnd: t[setupEnd], backlift: t[backlift], landing: t[landing], contact: t[contact] },
      facing,
    },
  };
}
