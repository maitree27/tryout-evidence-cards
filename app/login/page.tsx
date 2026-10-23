import Link from "next/link";
import { AuthShell } from "@/components/aura/auth-shell";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui/card";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { as } = await searchParams;
  const student = as === "student";

  return (
    <AuthShell
      title={student ? "Student log in" : "Coach log in"}
      subtitle={student ? "Welcome back. Log in to see your scores, feedback and progress." : "Welcome back, coach."}
    >
      <Card><AuthForm mode="login" hideSwitch={student} /></Card>
      {student ? (
        <p className="text-sm text-muted">
          New here? Open the invite link your coach sent you, or{" "}
          <Link href="/signup/student" className="underline underline-offset-4">create an account</Link> (18+) if you don&apos;t have a coach.{" "}
          <Link href="/login" className="underline underline-offset-4">I&apos;m a coach</Link>
        </p>
      ) : (
        <p className="text-sm text-muted">
          Are you a student? <Link href="/login?as=student" className="underline underline-offset-4">Student log in</Link>
        </p>
      )}
    </AuthShell>
  );
}
