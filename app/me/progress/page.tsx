import { redirect } from "next/navigation";
import { BigNumber, Tile } from "@/components/aura/parts";
import { TrendChart, type TrendRow } from "@/components/trend-chart";
import { Card } from "@/components/ui/card";
import { buildAthleteProgress } from "@/lib/athlete-progress";
import { loadProgress } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { BATTING_METRICS } from "@/sports/cricket/batting";

// Student progress: one score, one chart you can switch by skill, then streak and personal bests.
export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ skill?: string }> }) {
  const { skill } = await searchParams;
  const supabase = await createClient();
  const { data: athlete } = await supabase.from("athletes").select("id").maybeSingle();
  if (!athlete) redirect("/me");

  const points = (await loadProgress(supabase, athlete.id))[athlete.id] ?? [];
  const p = buildAthleteProgress(points);
  const rows: TrendRow[] = points.map((pt) => ({ date: pt.date, overall: pt.overall, ...Object.fromEntries(pt.metrics.map((m) => [m.key, m.score])) }));

  if (points.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 pt-6">
        <h1 className="text-3xl">Progress</h1>
        <p className="glass p-5 text-sm text-muted">Upload and analyse your first clip with the + button, and your progress will start to build here.</p>
      </div>
    );
  }

  const best = p.pbs.find((b) => b.key === "overall");
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-5 pt-6">
      <h1 className="text-3xl">Progress</h1>
      <BigNumber
        label="Your score"
        value={p.latest ?? "–"}
        size="text-[5.5rem]"
        note={p.change === null ? undefined : p.change === 0 ? "same as last clip" : `${p.change > 0 ? "up" : "down"} ${Math.abs(p.change)} since last clip`}
      />

      <Card>
        <TrendChart rows={rows} metrics={BATTING_METRICS.map((m) => ({ key: m.key, label: m.label }))} initial={skill} />
      </Card>

      <section className="grid grid-cols-2 gap-3" aria-label="Highlights">
        <Tile color="pink" label="Best so far" value={best?.value ?? "–"} note={p.newPb ? "New personal best" : undefined} />
        <Tile color="violet" label="Weeks in a row" value={p.streakWeeks} note={p.streakAlive ? "This week is done" : p.streakWeeks > 0 ? "Upload by Sunday" : undefined} />
        <Tile color="blue" label="Clips this week" value={p.clipsThisWeek} note={`last week ${p.clipsLastWeek}`} />
        <Tile color="green" label="Biggest gain" value={p.bestGain ? `+${p.bestGain.delta}` : "–"} note={p.bestGain?.label} />
      </section>

      <section className="glass p-4" aria-label="Upload calendar">
        <div className="mb-3 text-sm text-muted">Last 8 weeks</div>
        <div
          role="img"
          aria-label={`${p.calendar.filter((c) => c.uploaded).length} days with uploads in the last 8 weeks`}
          className="grid grid-flow-col grid-rows-7 justify-between gap-1"
        >
          {p.calendar.map((c) => (
            <span
              key={c.date}
              title={c.date}
              className={`h-4 w-4 rounded-[5px] ${c.uploaded ? "bg-success" : c.future ? "bg-transparent" : "bg-foreground/10"} ${c.today ? "ring-2 ring-foreground/50" : ""}`}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2" aria-label="Personal bests">
        <h2>Personal bests</h2>
        {p.pbs.slice(0, 4).map((b) => (
          <div key={b.key} className="glass flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-medium">{b.label}</span>
              <span className="block text-xs text-muted">Set {b.date}{b.isNew ? " · new" : ""}</span>
            </span>
            <span className="dot text-[1.75rem]">{b.value}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
