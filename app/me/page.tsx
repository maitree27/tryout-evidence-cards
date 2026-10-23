import { StudentHome } from "@/components/aura/student-home";
import { buildAthleteProgress } from "@/lib/athlete-progress";
import { feedbackSummary } from "@/lib/feedback-summary";
import { loadProgress } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

// Student home. Row-level security returns only this student's own record, clips and results.
export default async function StudentHomePage() {
  const supabase = await createClient();
  const { data: athlete } = await supabase.from("athletes").select("id, name, coach_id").maybeSingle();
  if (!athlete) return null; // the layout shows the profile set-up screen in this case

  const [progress, { data: videos }] = await Promise.all([
    loadProgress(supabase, athlete.id),
    supabase
      .from("videos")
      .select("id, shot_type, taken_on, status, analyses(feedback)")
      .eq("athlete_id", athlete.id)
      .order("taken_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  const points = [...(progress[athlete.id] ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const p = buildAthleteProgress(points);

  const skills = p.skills.filter((s) => s.series.length > 0);
  const strongest = skills.length ? skills.reduce((a, b) => (b.latest > a.latest ? b : a)) : null;
  const focus = skills.length > 1 ? skills.reduce((a, b) => (b.latest < a.latest ? b : a)) : null;

  const feedbackRaw = (videos ?? [])
    .map((v) => (Array.isArray(v.analyses) ? v.analyses[0] : v.analyses) as { feedback: string | null } | null)
    .find((a) => a?.feedback)?.feedback;

  return (
    <StudentHome
      firstName={athlete.name.split(" ")[0]}
      score={p.latest}
      change={p.change}
      series={points.map((pt) => pt.overall)}
      best={p.pbs.find((b) => b.key === "overall")?.value ?? null}
      streakWeeks={p.streakWeeks}
      strongest={strongest ? { key: strongest.key, label: strongest.label, value: strongest.latest } : null}
      focus={focus ? { key: focus.key, label: focus.label, value: focus.latest } : null}
      nudge={
        p.streakAlive
          ? null
          : (videos ?? []).length === 0
            ? "Film your first clip to get your score. Tap to see how."
            : p.streakWeeks > 0
              ? `No clip yet this week. Upload one to keep your ${p.streakWeeks}-week streak.`
              : "No clip yet this week. Upload one to start a new streak."
      }
      feedback={feedbackSummary(feedbackRaw)}
      week={p.calendar.slice(49, 56).map((c, i) => ({ letter: "MTWTFSS"[i], on: c.uploaded, today: c.today }))}
    />
  );
}
