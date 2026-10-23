"use client";

import { fmtTime } from "@/components/moment-note-form";

/** Tap to make the video on this page jump to the moment a note is about. */
export function SeekChip({ t }: { t: number }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("willow-seek", { detail: { t } }))} className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium hover:bg-white/25">
      ▶ {fmtTime(t)}
    </button>
  );
}
