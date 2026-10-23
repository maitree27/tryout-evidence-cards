import { AuthShell } from "@/components/aura/auth-shell";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <AuthShell title="Create your coach account" subtitle="Add your students, upload clips and see who needs you.">
      <Card><AuthForm mode="signup" /></Card>
    </AuthShell>
  );
}
