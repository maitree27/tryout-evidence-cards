import Link from "next/link";
import type { ReactNode } from "react";
import { BigNumber, Sparkline, Tile } from "@/components/aura/parts";

export type StudentHomeProps = {
  firstName: string;
  score: number | null;
  change: number | null;
  series: number[];
  best: number | null;
  streakWeeks: number;
  strongest: { key: string; label: string; value: number } | null;
  focus: { key: string; label: string; value: number } | null;
  feedback: string | null;
  week: { letter: string; on: boolean; today: boolean }[];
  nudge?: string | null;
  more?: ReactNode;
};

/** Student home: one big score, a few tiles, one button. Everything else is a tap away. */
export function StudentHome(p: StudentHomeProps) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl">Hi {p.firstName}</h1>
        <div className="flex gap-1.5" role="group" aria-label="Days you uploaded this week">
          {p.week.map((d, i) => (
            <span
              key={i}
              className={`grid h-7 w-7 place-items-center rounded-full border text-[11px] font-semibold ${d.on ? "border-transparent bg-foreground text-background" : "border-border text-muted"} ${d.today ? "ring-2 ring-foreground/40" : ""}`}
              title={d.on ? "Uploaded" : d.today ? "Today" : ""}
            >
              {d.letter}
            </span>
          ))}
        </div>
      </div>

      {p.nudge && (
        <Link href="/me/upload" className="glass flex items-center justify-between gap-3 border-l-4 border-l-accent px-4 py-3 text-[15px]">
          <span>{p.nudge}</span>
          <span aria-hidden="true" className="text-lg">→</span>
        </Link>
      )}

      <BigNumber
        size="text-[5rem]"
        label="Your score"
        value={p.score ?? "–"}
        note={p.change === null ? "Upload a clip to start your progress" : p.change === 0 ? "same as last time" : `${p.change > 0 ? "up" : "down"} ${Math.abs(p.change)} since last clip`}
      />
      <Sparkline values={p.series} />

      <section className="grid grid-cols-2 gap-3" aria-label="Highlights">
        <Tile color="pink" label="Best so far" value={p.best ?? "–"} className="col-span-2" href="/me/progress" />
        <Tile color="green" label={p.strongest ? `Strongest: ${p.strongest.label}` : "Strongest"} value={p.strongest?.value ?? "–"} href={p.strongest ? `/me/progress?skill=${p.strongest.key}` : "/me/progress"} />
        <Tile color="orange" label={p.focus ? `Work on: ${p.focus.label}` : "Work on"} value={p.focus?.value ?? "–"} href={p.focus ? `/me/progress?skill=${p.focus.key}` : "/me/progress"} />
        <Tile color="violet" label="Weeks in a row" value={p.streakWeeks} className="col-span-2" href="/me/progress" />
      </section>

      {p.feedback && (
        <section className="glass p-4">
          <div className="text-xs text-muted">Latest feedback</div>
          <p className="mt-1 line-clamp-3 text-[15px] leading-relaxed">{p.feedback}</p>
        </section>
      )}

      {p.more}
    </div>
  );
}
