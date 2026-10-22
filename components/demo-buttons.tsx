"use client";

import { useState, useTransition } from "react";
import { clearDemoData, loadDemoData } from "@/app/actions/demo";
import { Button } from "@/components/ui/button";

export function DemoButtons({ hasDemo }: { hasDemo: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="space-y-1">
      {hasDemo ? (
        <Button variant="outline" disabled={pending} onClick={() => start(async () => { await clearDemoData(); })}>
          {pending ? "Removing…" : "Remove demo data"}
        </Button>
      ) : (
        <Button variant="outline" disabled={pending} onClick={() => start(async () => { setError((await loadDemoData()).error); })}>
          {pending ? "Loading…" : "Load demo data"}
        </Button>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
