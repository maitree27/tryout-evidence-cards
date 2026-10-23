import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StudentSignupForm } from "@/components/student-signup-form";

export const metadata = { title: "Create a student account · Willow" };

export default function StudentSignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-primary underline">← Back</Link>
      <h1 className="text-4xl">Create a student account</h1>
      <p className="text-sm text-muted">
        For your own personal use: upload batting clips, get scores and feedback, and track your progress. Only you can see your videos.
      </p>
      <Card className="border-accent text-sm">
        <strong>Have an invite link from your coach?</strong> Open that link instead. It connects you to your coach.
      </Card>
      <Card>
        <StudentSignupForm mode="signup" />
      </Card>
      <p className="text-xs text-muted">Accounts without a coach are for people aged 18 and over.</p>
    </main>
  );
}
