import { CRITERION_IDS, RATINGS, type Rating } from "./criteria";
import type { CriterionResult, Observation } from "./schema";

export type RawAnalysis = {
  player_visible?: boolean;
  footage_usable?: boolean;
  footage_note?: string;
  criteria?: {
    id?: string;
    rating?: string;
    reason?: string;
    observations?: { timestamp?: number; text?: string; confidence?: number }[];
  }[];
};

const MIN_OBSERVATIONS = 2;
const MIN_AVG_CONFIDENCE = 0.5;

// The safety net. We never trust the AI's answer as-is:
// - observations that cite a time we never sent are thrown away
// - weak evidence is flagged by this code, whatever the AI claimed
export function validateEvidence(
  raw: RawAnalysis,
  sentTimestamps: number[],
  qualityOk: boolean,
) {
  const playerVisible = raw.player_visible === true;
  const footageUsable = raw.footage_usable === true && qualityOk;

  const criteria: CriterionResult[] = CRITERION_IDS.map((id) => {
    const found = raw.criteria?.find((c) => c.id === id);
    const observations: Observation[] = (found?.observations ?? [])
      .filter(
        (o) =>
          typeof o.timestamp === "number" &&
          sentTimestamps.some((t) => Math.abs(t - o.timestamp!) < 0.15) &&
          typeof o.text === "string" &&
          o.text.trim() !== "",
      )
      .map((o) => ({
        timestamp: o.timestamp!,
        text: o.text!.trim(),
        confidence: Math.min(1, Math.max(0, Number(o.confidence) || 0)),
      }));

    const avgConf = observations.length
      ? observations.reduce((s, o) => s + o.confidence, 0) / observations.length
      : 0;
    const rating: Rating = RATINGS.includes(found?.rating as Rating) ? (found!.rating as Rating) : "cant_tell";

    const insufficient =
      !playerVisible ||
      !footageUsable ||
      rating === "cant_tell" ||
      observations.length < MIN_OBSERVATIONS ||
      avgConf < MIN_AVG_CONFIDENCE;

    return {
      id,
      // Never show a rating that has no solid evidence behind it.
      rating: insufficient ? "cant_tell" : rating,
      reason: found?.reason?.trim() || "No evidence was provided for this.",
      observations: !playerVisible || !footageUsable ? [] : observations,
      insufficient,
    };
  });

  return { playerVisible, footageUsable, footageNote: raw.footage_note?.trim() ?? "", criteria };
}
