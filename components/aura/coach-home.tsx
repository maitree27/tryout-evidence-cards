import Link from "next/link";
import { BigNumber, StudentRow, Tile } from "@/components/aura/parts";

export type CoachHomeProps = {
  average: number | null;
  averageChange: number | null;
  needLook: number;
  toReview: number;
  total: number;
  rows: { id: string; name: string; note: string; score: number | null; tone: "good" | "warn" | "bad" | "none" }[];
};

/** Coach home: fits one screen. One big squad number, two tappable tiles, the top few students to look at. */
export function CoachHome(p: CoachHomeProps) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-5 pt-6">
      <BigNumber
        label="Squad average"
        value={p.average ?? "–"}
        note={p.averageChange === null ? "Add students and clips to see how your squad is doing" : p.averageChange === 0 ? "no change this month" : `${p.averageChange > 0 ? "up" : "down"} ${Math.abs(p.averageChange)} this month`}
      />

      <section className="grid grid-cols-2 gap-3" aria-label="At a glance">
        <Tile color="orange" label="Need a look" value={p.needLook} href="/students?filter=look" />
        <Tile color="blue" label="To review" value={p.toReview} href="/review" />
      </section>

      <section aria-label="Top of your list" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2>{p.rows.length ? "Start here" : "Your students"}</h2>
          {p.total > 3 && <Link href="/students" className="text-sm underline underline-offset-4">See all {p.total}</Link>}
        </div>
        {p.rows.length === 0 ? (
          <p className="glass p-4 text-sm text-muted">No students yet. Tap the + button to add your first one, or open More to load demo data.</p>
        ) : (
          p.rows.map((r) => <StudentRow key={r.id} href={`/athletes/${r.id}`} name={r.name} note={r.note} score={r.score ?? "–"} tone={r.tone} />)
        )}
      </section>
    </div>
  );
}
