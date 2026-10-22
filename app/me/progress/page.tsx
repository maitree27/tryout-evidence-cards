import Link from "next/link";
import { redirect } from "next/navigation";
import { TrendChart, type TrendRow } from "@/components/trend-chart";
import { Card } from "@/components/ui/card";
import { buildAthleteProgress } from "@/lib/athlete-progress";
import { loadProgress } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { BATTING_METRICS } from "@/sports/cricket/batting";

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="inline-block h-7 w-20" aria-hidden="true" />;
  const pts = values.map((v, i) => `${2 + (i * 76) / (values.length - 1)},${25 - (v / 100) * 22}`).join(" ");
  return (
    <svg width="80" height="28" viewBox="0 0 80 28" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="#2f5bff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Strava-style progress view for the athlete. Row-level security means the data below can only ever be this athlete's own.
export default async function AthleteProgressPage() {
  const supabase = await createClient();
  const { data: athlete } = await supabase.from("athletes").select("id, name").maybeSingle();
  if (!athlete) redirect("/me");

  const points = (await loadProgress(supabase, athlete.id))[athlete.id] ?? [];
  const p = buildAthleteProgress(points);
  const rows: TrendRow[] = points.map((pt) => ({ date: pt.date, overall: pt.overall, ...Object.fromEntries(pt.metrics.map((m) => [m.key, m.score])) }));

  if (points.length === 0) {
    return (
      <>
        <Link href="/me" className="text-sm text-primary underline">← Home</Link>
        <h1 className="text-4xl">Your progress</h1>
        <Card className="text-sm text-muted">Upload and analyse your first clip and your progress will start to build here.</Card>
      </>
    );
  }

  return (
    <>
      <Link href="/me" className="text-sm text-primary underline">← Home</Link>
      <h1 className="text-5xl leading-none">Your progress</h1>

      <section className="relative bg-primary p-5 text-primary-foreground">
        <div className="font-mono text-xs font-bold uppercase tracking-widest">This week vs last</div>
        <div className="mt-1 flex items-end gap-3">
          <span className="font-display text-7xl leading-none">{p.latest}</span>
          {p.change !== null && <span className="pb-1 font-display text-3xl">{p.change >= 0 ? "▲ +" : "▼ "}{p.change}</span>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="border-t-2 border-white/50 pt-2">
            <div className="font-mono text-[11px] opacity-85">CLIPS</div>
            <div className="font-display text-2xl">{p.clipsThisWeek} <span className="font-sans text-sm opacity-80">(last week {p.clipsLastWeek})</span></div>
          </div>
          <div className="border-t-2 border-white/50 pt-2">
            <div className="font-mono text-[11px] opacity-85">BIGGEST GAIN</div>
            <div className="font-display text-2xl uppercase">{p.bestGain ? `${p.bestGain.label} +${p.bestGain.delta}` : "–"}</div>
          </div>
        </div>
        {p.newPb && <div className="absolute right-4 top-4 -rotate-3 bg-accent px-3 py-1 font-display text-xl text-foreground">NEW PB!</div>}
      </section>

      <section className="space-y-2">
        <h2>Progress</h2>
        <Card>
          <TrendChart rows={rows} metrics={BATTING_METRICS.map((m) => ({ key: m.key, label: m.label }))} />
        </Card>
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2>Streak</h2>
          <span className="font-display text-3xl text-accent">{p.streakWeeks} {p.streakWeeks === 1 ? "WEEK" : "WEEKS"}</span>
        </div>
        <div className="flex items-center gap-4 bg-foreground p-4">
          <div
            role="img"
            aria-label={`Upload calendar for the last 8 weeks: ${p.calendar.filter((c) => c.uploaded).length} days with uploads`}
            className="grid shrink-0 grid-flow-col grid-rows-7 gap-1"
          >
            {p.calendar.map((c) => (
              <span
                key={c.date}
                title={c.date}
                className={`h-[18px] w-[18px] ${c.uploaded ? "bg-primary" : c.future ? "bg-transparent" : "bg-[#2a2a2a]"} ${c.today ? "outline outline-[3px] outline-accent" : ""}`}
              />
            ))}
          </div>
          <p className="text-sm leading-snug text-background">
            Upload at least once a week to keep it alive.
            <br />
            <strong className="text-accent">{p.streakAlive ? "This week is done. Nice." : p.streakWeeks > 0 ? "Upload by Sunday to keep your streak." : "Upload a clip to start a streak."}</strong>
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <h2>Personal bests</h2>
        <ul className="space-y-2">
          {p.pbs.slice(0, 5).map((b) => (
            <li key={b.key} className={`flex items-center gap-3 border-2 border-border px-4 py-2 ${b.isNew ? "bg-[#ffd9c9]" : "bg-card"}`}>
              <span className="min-w-14 font-display text-4xl leading-none">{b.value}</span>
              <span className="flex-1">
                <span className="block text-sm font-bold uppercase">{b.label}</span>
                <span className="block font-mono text-[11px] text-muted">Set {b.date}</span>
              </span>
              <span className="bg-foreground px-2 py-0.5 font-mono text-[11px] font-bold text-background">{b.isNew ? "NEW PB" : "PB"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2>Skills</h2>
        <ul className="border-t-2 border-border">
          {p.skills.map((s) => (
            <li key={s.key} className="flex items-center gap-3 border-b border-[#cfc9bb] py-3">
              <span className="flex-1 text-sm font-bold uppercase">{s.label}</span>
              <Spark values={s.series} />
              <span className="min-w-9 text-right font-display text-3xl">{s.latest}</span>
              <span className={`min-w-10 text-right font-mono text-xs font-bold ${s.delta === null ? "text-muted" : s.delta >= 0 ? "text-primary" : "text-danger"}`}>
                {s.delta === null ? "" : `${s.delta >= 0 ? "▲ +" : "▼ "}${s.delta}`}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
