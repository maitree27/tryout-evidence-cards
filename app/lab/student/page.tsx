import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-header";
import { StudentHome } from "@/components/aura/student-home";

// DEV-ONLY preview of the student home with sample data (no login). Disabled in production.
export default function StudentPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <AppShell role="student" homeHref="/lab/student">
      <StudentHome
        firstName="Aarav"
        score={79}
        change={5}
        series={[52, 57, 60, 62, 67, 70, 74, 79]}
        best={79}
        streakWeeks={6}
        strongest={{ key: "head_stillness", label: "Head", value: 88 }}
        focus={{ key: "footwork", label: "Footwork", value: 52 }}
        feedback="Your head stayed very still, which is the hardest part. Next, step a little further towards the ball."
        week={[1, 0, 1, 0, 1, 0, 0].map((on, i) => ({ letter: "MTWTFSS"[i], on: !!on, today: i === 4 }))}
      />
    </AppShell>
  );
}
