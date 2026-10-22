import Link from "next/link";
import { DemoButtons } from "@/components/demo-buttons";
import { Badge, Card } from "@/components/ui/card";
import { loadProgress } from "@/lib/data";
import { summarize, type AthleteSummary } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";

const DEMO_NOTE = "Demo student";

function ChangeBadge({ change }: { change: number | null }) {
  if (change === null) return <span className="text-xs text-muted">–</span>;
  return (
    <span className={`text-sm font-medium ${change >= 0 ? "text-primary" : "text-danger"}`}>
      {change > 0 ? "▲ +" : change < 0 ? "▼ " : ""}{change}
    </span>
  );
}

function Reasons({ s }: { s: AthleteSummary }) {
  return (
    <span className="flex flex-wrap gap-1">
      {s.flags.includes("declining") && <Badge tone="bad">Declining</Badge>}
      {s.flags.includes("unreviewed") && <Badge tone="warn">{s.unreviewed} not reviewed</Badge>}
      {s.flags.includes("inactive") && <Badge tone="warn">No upload in 2+ weeks</Badge>}
      {s.flags.includes("new") && <Badge>No videos yet</Badge>}
    </span>
  );
}

export default async function RosterPage() {
  const supabase = await createClient();
  const [{ data: athletes }, progress] = await Promise.all([
    supabase.from("athletes").select("id, name, batting_hand, archived, notes").order("name"),
    loadProgress(supabase),
  ]);
  const active = (athletes ?? []).filter((a) => !a.archived);
  const hasDemo = (athletes ?? []).some((a) => a.notes?.startsWith(DEMO_NOTE));

  const rows = active.map((a) => ({ ...a, s: summarize(progress[a.id] ?? []) }));
  const attention = rows.filter((r) => r.s.flags.some((f) => f !== "new")).sort((a, b) => b.s.flags.length - a.s.flags.length);
  const improvers = rows.filter((r) => (r.s.change ?? 0) > 0).sort((a, b) => b.s.change! - a.s.change!).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-4xl">Your students</h1>
        <div className="flex items-center gap-2">
          <DemoButtons hasDemo={hasDemo} />
          <Link href="/athletes/new" className="rounded-ui bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Add student</Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="text-center text-sm text-muted">
          No students yet. Add your first one, or load demo data to see how the app looks with real-looking results.
        </Card>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="font-medium">Needs your attention</h2>
            {attention.length === 0 ? (
              <p className="text-sm text-muted">Nobody needs attention right now.</p>
            ) : (
              <ul className="space-y-2">
                {attention.map((r) => (
                  <li key={r.id}>
                    <Link href={`/athletes/${r.id}`}>
                      <Card className="flex flex-wrap items-center justify-between gap-2 border-warning/50 hover:border-primary">
                        <span className="font-medium">{r.name}</span>
                        <Reasons s={r.s} />
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="font-medium">Top improvers</h2>
            {improvers.length === 0 ? (
              <p className="text-sm text-muted">Needs at least two analysed videos per student.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-3">
                {improvers.map((r) => (
                  <li key={r.id}>
                    <Link href={`/athletes/${r.id}`}>
                      <Card className="hover:border-primary">
                        <div className="font-medium">{r.name}</div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-4xl">{r.s.latest}</span>
                          <ChangeBadge change={r.s.change} />
                        </div>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="font-medium">All students</h2>
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted">
                  <tr><th className="p-3">Student</th><th className="p-3">Latest</th><th className="p-3">Trend</th><th className="p-3">Last video</th><th className="p-3">Videos</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="p-3"><Link href={`/athletes/${r.id}`} className="font-medium text-primary underline">{r.name}</Link></td>
                      <td className="p-3">{r.s.latest ?? "–"}</td>
                      <td className="p-3"><ChangeBadge change={r.s.change} /></td>
                      <td className="p-3 text-muted">{r.s.lastDate ?? "–"}</td>
                      <td className="p-3 text-muted">{r.s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
