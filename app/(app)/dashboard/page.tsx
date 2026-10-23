import { CoachHome } from "@/components/aura/coach-home";
import { loadCoachRows } from "@/lib/coach-data";
import { createClient } from "@/lib/supabase/server";

export default async function CoachDashboard() {
  const supabase = await createClient();
  const d = await loadCoachRows(supabase);
  return (
    <CoachHome
      average={d.average}
      averageChange={d.averageChange}
      needLook={d.needLook}
      toReview={d.toReview}
      total={d.rows.length}
      rows={d.rows.slice(0, 3).map((r) => ({ id: r.id, name: r.name, note: r.note, score: r.score, tone: r.tone }))}
    />
  );
}
