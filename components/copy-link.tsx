"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input readOnly value={url} aria-label="Invite link" className="min-w-0 flex-1 border-2 border-border bg-card px-2 py-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
      <Button
        variant="outline"
        type="button"
        onClick={async () => {
          try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* user can copy from the box */ }
        }}
      >
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
