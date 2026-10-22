import OpenAI from "openai";
import { GEMINI_DEFAULT_MODEL, geminiText } from "@/lib/analysis/gemini";
import { BATTING_METRICS } from "@/sports/cricket/batting";
import { shotLabel } from "@/sports/cricket/shots";
import type { AnalysisResult } from "@/sports/types";

const SYSTEM = `You write short coaching feedback for a young cricketer's batting clip.
You are given measurements that software computed from body-pose tracking. Rules:
- Use ONLY the numbers and descriptions given. Never invent measurements, and never comment on things not measured (grip, bat angle, bat speed, the ball, shot result).
- Skip any metric marked "not measured".
- Plain, encouraging English a teenager understands. No jargon without explaining it.
- Output Markdown with exactly these sections:
**Summary** (2 sentences)
**What's working** (up to 3 bullets, citing the measurement)
**Work on next** (up to 3 bullets, lowest scores first; each ends with one simple drill)
**Note** (one sentence: this is an automatic estimate from video, and the coach has the final say)`;

function describe(result: AnalysisResult, shotType: string, handedness: string) {
  const lines = result.metrics.map((m) => {
    const def = BATTING_METRICS.find((d) => d.key === m.key)!;
    return m.reliable
      ? `- ${m.label}: score ${m.score}/100. ${m.detail} (Meaning: ${def.meaning}. Ideal: ${m.ideal}.)`
      : `- ${m.label}: not measured`;
  });
  return `Shot: ${shotLabel(shotType)}. Batter is ${handedness}-handed. Overall score: ${result.overall}/100.\n${lines.join("\n")}${
    result.quality.warnings.length ? `\nCaveats: ${result.quality.warnings.join(" ")}` : ""
  }`;
}

/** Simple template feedback used when no AI key is set or the AI call fails. Same numbers, no creativity. */
export function templateFeedback(result: AnalysisResult): string {
  const ok = result.metrics.filter((m) => m.reliable).sort((a, b) => b.score! - a.score!);
  const best = ok.slice(0, 3).filter((m) => m.score! >= 60);
  const worst = [...ok].reverse().slice(0, 3).filter((m) => m.score! < 75);
  return [
    `**Summary**\nOverall score ${result.overall}/100 from ${ok.length} measured areas.`,
    `**What's working**\n${best.length ? best.map((m) => `- ${m.label} (${m.score}/100): ${m.detail}`).join("\n") : "- No area scored above 60 on this clip."}`,
    `**Work on next**\n${worst.length ? worst.map((m) => `- ${m.label} (${m.score}/100): ${m.detail} Ideal: ${m.ideal}.`).join("\n") : "- Nothing stood out as weak on this clip."}`,
    `**Note**\nAutomatic estimate from video; the coach has the final say.`,
  ].join("\n\n");
}

export async function writeFeedback(
  result: AnalysisResult,
  shotType: string,
  handedness: string,
): Promise<{ text: string; model: string }> {
  const user = describe(result, shotType, handedness);

  // 1. Google Gemini, when a Gemini key is set.
  if (process.env.GEMINI_API_KEY) {
    const model = process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;
    try {
      const text = await geminiText({ apiKey: process.env.GEMINI_API_KEY, model, system: SYSTEM, user });
      return { text, model };
    } catch (e) {
      console.error("Gemini feedback failed, trying next option:", e instanceof Error ? e.message : e);
    }
  }

  // 2. OpenAI, when an OpenAI key is set.
  if (process.env.OPENAI_API_KEY) {
    const model = process.env.OPENAI_MODEL || "gpt-4o";
    try {
      const client = new OpenAI({ timeout: 25_000, maxRetries: 1 });
      const res = await client.chat.completions.create({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
      });
      const text = res.choices[0]?.message?.content?.trim();
      if (text) return { text, model };
    } catch (e) {
      console.error("OpenAI feedback failed, using template:", e instanceof Error ? e.message : e);
    }
  }

  // 3. Plain template: same numbers, no AI.
  return { text: templateFeedback(result), model: "template" };
}
