import { Chips } from "@/components/aura/chips";
import { StudentRow } from "@/components/aura/parts";
import { loadCoachRows } from "@/lib/coach-data";
import { createClient } from "@/lib/supabase/server";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "look", label: "Need a look" },
  { key: "improving", label: "Improving" },
  { key: "new", label: "New" },
];

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const { filter = "all", q = "" } = await searchParams;
  const supabase = await createClient();
  const { rows } = await loadCoachRows(supabase);

  const matches = {
    all: () => true,
    look: (r: (typeof rows)[number]) => r.kind === "declining" || r.kind === "inactive" || r.kind === "review",
    improving: (r: (typeof rows)[number]) => r.kind === "improving",
    new: (r: (typeof rows)[number]) => r.kind === "new",
  } as const;
  const key = (filter in matches ? filter : "all") as keyof typeof matches;
  const query = q.trim().toLowerCase();
  const shown = rows.filter(matches[key]).filter((r) => !query || r.name.toLowerCase().includes(query));

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 pt-6">
      <h1 className="text-3xl">Students</h1>
      <form action="/students" method="get" role="search">
        {key !== "all" && <input type="hidden" name="filter" value={key} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name"
          aria-label="Search students by name"
          className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm outline-none placeholder:text-muted focus:border-foreground"
        />
      </form>
      <Chips
        active={key}
        items={FILTERS.map((f) => ({ ...f, href: f.key === "all" ? "/students" : `/students?filter=${f.key}`, count: rows.filter(matches[f.key as keyof typeof matches]).length }))}
      />
      <section className="flex flex-col gap-2" aria-label="Student list">
        {shown.length === 0 ? (
          <p className="glass p-4 text-sm text-muted">{rows.length === 0 ? "No students yet. Tap the + button to add one." : "Nobody matches that. Try another filter or search."}</p>
        ) : (
          shown.map((r) => <StudentRow key={r.id} href={`/athletes/${r.id}`} name={r.name} note={r.note} score={r.score ?? "–"} tone={r.tone} />)
        )}
      </section>
    </div>
  );
}
