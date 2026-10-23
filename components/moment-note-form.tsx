"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";

export function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/** Note box for the coach. "Pin to this moment" stamps the note with the video's current time. */
export function MomentNoteForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const [at, setAt] = useState<number | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const pin = () => {
    const v = document.querySelector("video");
    if (v) { v.pause(); setAt(Math.round(v.currentTime * 10) / 10); }
  };
  return (
    <form ref={ref} action={async (fd) => { await action(fd); setAt(null); ref.current?.reset(); }} className="space-y-2">
      <Textarea name="body" required placeholder="What did you notice? What should they work on?" />
      <input type="hidden" name="at_s" value={at ?? ""} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={pin}>{at === null ? "Pin to this moment in the video" : `Pinned at ${fmtTime(at)} · re-pin`}</Button>
        {at !== null && <Button type="button" variant="ghost" onClick={() => setAt(null)}>Unpin</Button>}
        <Button type="submit">Add note</Button>
      </div>
      <p className="text-xs text-muted">Pause the video on the moment you mean, then tap Pin.</p>
    </form>
  );
}
