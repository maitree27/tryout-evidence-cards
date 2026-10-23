/** Pulls the short "Summary" paragraph out of the written feedback (falls back to the first sentence or two). */
export function feedbackSummary(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/\*\*Summary\*\*\s*([\s\S]*?)(?:\n\s*\n\*\*|\n\*\*|$)/);
  const raw = (m ? m[1] : text).replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  if (!raw) return null;
  return raw.length > 200 ? raw.slice(0, 197).trimEnd() + "…" : raw;
}
