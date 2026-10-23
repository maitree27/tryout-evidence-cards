"use client";

import { useId, useState, type ReactNode } from "react";

/** App-style segmented tabs. All panels are sent with the page and shown one at a time, so switching is instant. */
export function Tabs({ tabs, initial }: { tabs: { key: string; label: string; content: ReactNode }[]; initial?: string }) {
  const [active, setActive] = useState(initial && tabs.some((t) => t.key === initial) ? initial : tabs[0].key);
  const id = useId();
  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Sections" className="glass flex gap-1 rounded-full p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            id={`${id}-${t.key}-tab`}
            aria-selected={active === t.key}
            aria-controls={`${id}-${t.key}`}
            onClick={() => setActive(t.key)}
            className={`min-h-10 flex-1 rounded-full px-2 text-sm font-medium transition active:scale-95 ${active === t.key ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} role="tabpanel" id={`${id}-${t.key}`} aria-labelledby={`${id}-${t.key}-tab`} hidden={active !== t.key} className="flex flex-col gap-4">
          {t.content}
        </div>
      ))}
    </div>
  );
}
