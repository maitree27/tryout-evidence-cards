// Shared shapes for any sport/skill analysis. A new skill (bowling, fielding, other sports)
// supplies its own config + analyze function that returns these.

/** [x, y, visibility]; x and y are 0-1 fractions of the video frame, as MediaPipe returns them. */
export type Landmark = [number, number, number];

/** One sampled video frame. `lm` is null when no person was found. */
export type Frame = { t: number; lm: Landmark[] | null };

export type MetricResult = {
  key: string;
  label: string;
  /** The measured number (units in `unit`), null when it could not be measured. */
  raw: number | null;
  unit: string;
  /** 0-100, null when unreliable. */
  score: number | null;
  reliable: boolean;
  /** Plain-English description of what was measured, including the number. */
  detail: string;
  /** What good looks like, in words. */
  ideal: string;
  weight: number;
};

export type AnalysisQuality = {
  framesTotal: number;
  framesWithPose: number;
  poseCoverage: number;
  warnings: string[];
  events?: { setupEnd: number; backlift: number; landing: number; contact: number } | null;
  facing?: 1 | -1;
};

export type AnalysisResult = {
  configVersion: string;
  overall: number | null;
  metrics: MetricResult[];
  quality: AnalysisQuality;
};
