// Minimal Google Gemini client (Interactions API, plain fetch: no extra package).
// Used only to phrase feedback from finished numbers. It never receives video or names.

export const GEMINI_DEFAULT_MODEL = "gemini-3.5-flash-lite";

type Block = { type?: string; text?: string };
type Step = { type?: string; content?: Block[] };

/** Pulls the model's reply text out of an Interactions response, ignoring "thought" steps. */
export function extractText(json: unknown): string {
  const steps = ((json as { steps?: Step[] })?.steps ?? []) as Step[];
  const out: string[] = [];
  for (const s of steps) {
    if (s.type && s.type !== "model_output") continue;
    for (const b of s.content ?? []) if (b.type === "text" && b.text) out.push(b.text);
  }
  return out.join("").trim();
}

export async function geminiText(opts: {
  apiKey: string;
  model?: string;
  system: string;
  user: string;
  timeoutMs?: number;
}): Promise<string> {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "x-goog-api-key": opts.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model || GEMINI_DEFAULT_MODEL,
      system_instruction: opts.system,
      input: opts.user,
      generation_config: { max_output_tokens: 900 }, // newer models ignore temperature, so none is sent
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (Array.isArray(body) ? body[0] : body)?.error;
    throw new Error(`Gemini ${res.status}: ${String(e?.message ?? "request failed").slice(0, 120)}`);
  }
  const text = extractText(body);
  if (!text) throw new Error("Gemini returned no text");
  return text;
}
