import { NextResponse } from "next/server";
import { CRITERIA } from "@/lib/criteria";
import { validateEvidence, type RawAnalysis } from "@/lib/validateEvidence";

export const maxDuration = 60;

type Body = {
  player?: { name?: string; number?: string };
  description?: string;
  consent?: boolean;
  qualityOk?: boolean;
  frames?: { timestamp: number; dataUrl: string }[];
};

const SYSTEM_PROMPT = `You are an assistant helping a youth soccer coach review tryout footage.
You are given still frames from one phone video, each labelled with its timestamp in seconds.

STRICT RULES
1. Only describe the ONE player the coach identifies. If you cannot confidently find that player in a frame, do not describe anyone else instead. Say they are not visible.
2. Every observation must cite a timestamp that was given to you, and describe only what is clearly visible in that frame. Never invent actions, never guess what happened between frames.
3. A still frame cannot prove a whole pass, sprint or tackle. Describe the visible moment only, and lower your confidence accordingly.
4. Confidence is a number from 0 to 1. Use below 0.5 when unsure.
5. If the evidence for a criterion is thin, set its rating to "cant_tell" and explain why. "cant_tell" is a good answer, not a failure.
6. If the footage is too dark, blurry, shaky or distant to judge, set footage_usable to false.
7. If the footage is not soccer (a match, scrimmage or soccer drill), for example a relay race or warm-up with no ball play, every criterion must be "cant_tell" and footage_usable must be false. Never give a soccer rating for non-soccer activity.
8. Be neutral and factual. Do not comment on attitude, personality or appearance.
Ratings: "strong", "developing", "limited", or "cant_tell".`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["player_visible", "footage_usable", "footage_note", "criteria"],
  properties: {
    player_visible: { type: "boolean" },
    footage_usable: { type: "boolean" },
    footage_note: { type: "string" },
    criteria: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "rating", "reason", "observations"],
        properties: {
          id: { type: "string", enum: CRITERIA.map((c) => c.id) },
          rating: { type: "string", enum: ["strong", "developing", "limited", "cant_tell"] },
          reason: { type: "string" },
          observations: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["timestamp", "text", "confidence"],
              properties: {
                timestamp: { type: "number" },
                text: { type: "string" },
                confidence: { type: "number" },
              },
            },
          },
        },
      },
    },
  },
};

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "The server has no API key set. Add OPENROUTER_API_KEY to .env.local." }, { status: 500 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "That request was unreadable." }, { status: 400 });
  }

  // Plain-code checks first. We refuse to guess who the player is.
  const { player, description, consent, frames } = body;
  if (!player?.name || !player?.number) {
    return NextResponse.json({ error: "Choose which player this clip is for." }, { status: 400 });
  }
  if (!description || description.trim().length < 3) {
    return NextResponse.json({ error: "Describe how to spot the player (for example: red bib, starts on the left wing)." }, { status: 400 });
  }
  if (consent !== true) {
    return NextResponse.json({ error: "Please confirm consent before analysing." }, { status: 400 });
  }
  if (!Array.isArray(frames) || frames.length < 1 || frames.length > 12) {
    return NextResponse.json({ error: "No usable frames were received from the clip." }, { status: 400 });
  }
  if (frames.some((f) => typeof f.timestamp !== "number" || !f.dataUrl?.startsWith("data:image/jpeg;base64,"))) {
    return NextResponse.json({ error: "The frames were not in the expected format." }, { status: 400 });
  }

  const content: unknown[] = [
    {
      type: "text",
      text:
        `Player: ${player.name}, number ${player.number}.\n` +
        `How to spot them (from the coach): ${description.trim()}\n` +
        `Criteria to assess: ${CRITERIA.map((c) => `${c.id} (${c.hint})`).join("; ")}.\n` +
        `Frames follow, each labelled with its timestamp in seconds. Return one entry per criterion.`,
    },
  ];
  for (const f of frames) {
    content.push({ type: "text", text: `Frame at ${f.timestamp} seconds:` });
    content.push({ type: "image_url", image_url: { url: f.dataUrl } });
  }

  let raw: RawAnalysis;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash",
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "evidence_card", strict: true, schema: SCHEMA },
        },
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("OpenRouter error", res.status, detail.slice(0, 500));
      return NextResponse.json({ error: `The AI service returned an error (${res.status}). Try again in a moment.` }, { status: 502 });
    }
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    raw = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
  } catch (e) {
    console.error("Analyze failed", e);
    return NextResponse.json({ error: "The AI's answer couldn't be read. Please try again." }, { status: 502 });
  }

  const result = validateEvidence(
    raw,
    frames.map((f) => f.timestamp),
    body.qualityOk !== false,
  );
  return NextResponse.json(result);
}
