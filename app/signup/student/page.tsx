import { AuthShell } from "@/components/aura/auth-shell";
import { StudentSignupForm } from "@/components/student-signup-form";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Create a student account · Willow" };

export default function StudentSignupPage() {
  return (
    <AuthShell
      title="Create a student account"
      subtitle="For your own personal use: upload batting clips, get scores and feedback, and track your progress. Only you can see your videos."
    >
      <Card className="text-sm">
        <strong>Have an invite link from your coach?</strong> Open that link instead. It connects you to your coach.
      </Card>
      <Card><StudentSignupForm mode="signup" /></Card>
      <p className="text-xs text-muted">Accounts without a coach are for people aged 18 and over.</p>
    </AuthShell>
  );
}
