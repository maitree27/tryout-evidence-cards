// Shot/drill types a coach can tag a batting clip with, plus what "good" looks like for each.
// Ranges are in torso-lengths (shoulder-to-hip distance) so they work for any body size or camera distance.
// ALL RANGES ARE FIRST-PASS HEURISTICS: a real cricket coach should confirm/tune them.

type Range = { lo: number; hi: number; tol: number };

export type ShotProfile = {
  value: string;
  label: string;
  /** How far the front foot travels from set-up to contact (forward positive). */
  stride: Range;
  /** How far the hips shift towards the bowler from set-up to contact. */
  hipShift: Range;
  /** How much the hands rise after contact. */
  followRise: Range;
};

export const SHOT_PROFILES: ShotProfile[] = [
  { value: "drill", label: "General drill / net session", stride: { lo: 0.1, hi: 0.9, tol: 0.4 }, hipShift: { lo: -0.1, hi: 0.6, tol: 0.4 }, followRise: { lo: 0, hi: 1.4, tol: 0.5 } },
  { value: "front_foot_drive", label: "Front-foot drive", stride: { lo: 0.35, hi: 0.9, tol: 0.35 }, hipShift: { lo: 0.15, hi: 0.6, tol: 0.3 }, followRise: { lo: 0.5, hi: 1.4, tol: 0.5 } },
  { value: "forward_defence", label: "Forward defence", stride: { lo: 0.35, hi: 0.8, tol: 0.35 }, hipShift: { lo: 0.1, hi: 0.5, tol: 0.3 }, followRise: { lo: 0, hi: 0.5, tol: 0.4 } },
  { value: "back_foot_defence", label: "Back-foot defence", stride: { lo: -0.2, hi: 0.25, tol: 0.3 }, hipShift: { lo: -0.2, hi: 0.1, tol: 0.25 }, followRise: { lo: 0, hi: 0.4, tol: 0.4 } },
  { value: "pull", label: "Pull shot", stride: { lo: -0.2, hi: 0.3, tol: 0.3 }, hipShift: { lo: -0.15, hi: 0.2, tol: 0.25 }, followRise: { lo: 0.4, hi: 1.4, tol: 0.5 } },
  { value: "cut", label: "Cut shot", stride: { lo: -0.2, hi: 0.3, tol: 0.3 }, hipShift: { lo: -0.15, hi: 0.2, tol: 0.25 }, followRise: { lo: 0.2, hi: 1.0, tol: 0.5 } },
  { value: "sweep", label: "Sweep", stride: { lo: 0.2, hi: 0.6, tol: 0.3 }, hipShift: { lo: 0, hi: 0.4, tol: 0.3 }, followRise: { lo: 0, hi: 0.8, tol: 0.5 } },
];

export const SHOT_TYPES = SHOT_PROFILES.map(({ value, label }) => ({ value, label }));

export function shotProfile(value: string): ShotProfile {
  return SHOT_PROFILES.find((s) => s.value === value) ?? SHOT_PROFILES[0];
}

export function shotLabel(value: string) {
  return shotProfile(value).label;
}
