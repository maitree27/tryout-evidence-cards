"use client";

import { Button } from "@/components/ui/button";

const send = (action: string) => window.dispatchEvent(new CustomEvent("willow-sync", { detail: { action } }));

export function PlayBoth() {
  return (
    <div className="flex gap-2">
      <Button type="button" onClick={() => send("restart")}>Play both from start</Button>
      <Button type="button" variant="outline" onClick={() => send("pause")}>Pause both</Button>
    </div>
  );
}
