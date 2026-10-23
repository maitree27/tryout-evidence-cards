const TIPS = [
  { t: "Side-on", d: "Stand so the camera sees your side, not your front or back." },
  { t: "Phone steady", d: "Lean it on something or use a tripod. No holding it, no panning." },
  { t: "Whole body in frame", d: "Head to feet and the bat, with a little space around you." },
  { t: "One person", d: "Only the batter in the shot, if you can." },
  { t: "Good light", d: "Daylight, not strongly backlit. Plain clothes help." },
  { t: "One shot per clip", d: "5 to 15 seconds: set up, play the shot, finish." },
];

/** Simple picture + checklist so people film clips the scoring can actually read. */
export function FilmingGuide() {
  return (
    <details className="glass overflow-hidden" open>
      <summary className="cursor-pointer select-none px-4 py-3 text-[15px] font-medium">How to film a good clip</summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <svg viewBox="0 0 320 150" role="img" aria-label="Phone on a stand, side-on to the batter, about 5 metres away" className="w-full rounded-xl bg-black/20">
          <rect x="8" y="124" width="304" height="2" rx="1" fill="currentColor" opacity=".3" />
          {/* phone on stand */}
          <rect x="22" y="62" width="16" height="28" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M30 90 L22 124 M30 90 L38 124" stroke="currentColor" strokeWidth="2" />
          {/* view lines */}
          <path d="M40 72 L200 40 M40 80 L200 112" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" opacity=".6" />
          {/* batter side-on */}
          <circle cx="215" cy="46" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M215 54 L213 88 M213 88 L204 122 M213 88 L226 122 M214 62 L232 78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M232 78 L250 56" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <text x="104" y="144" fontSize="11" fill="currentColor" opacity=".8">about 5 metres</text>
          <text x="200" y="20" fontSize="11" fill="currentColor" opacity=".8">side-on</text>
        </svg>
        <ul className="grid gap-2 sm:grid-cols-2">
          {TIPS.map((x) => (
            <li key={x.t} className="flex gap-2 text-sm">
              <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/15 text-xs">✓</span>
              <span><b className="font-medium">{x.t}.</b> <span className="text-muted">{x.d}</span></span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
