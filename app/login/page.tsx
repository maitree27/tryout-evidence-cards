import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui/card";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { as } = await searchParams;
  const student = as === "student";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <Link href="/" className="text-sm text-primary underline">← Back</Link>
      <h1 className="text-4xl">{student ? "Student log in" : "Coach log in"}</h1>
      <p className="text-sm text-muted">
        {student
          ? "Welcome back. Log in to see your scores, feedback and progress."
          : "Willow: cricket batting analysis for coaches."}
      </p>
      <Card>
        <AuthForm mode="login" hideSwitch={student} />
      </Card>
      {student ? (
        <p className="text-sm text-muted">
          New here? Open the invite link your coach sent you, or{" "}
          <Link href="/signup/student" className="text-primary underline">create an account</Link> (18+) if you don&apos;t have a coach.{" "}
          <Link href="/login" className="text-primary underline">I&apos;m a coach</Link>
        </p>
      ) : (
        <p className="text-sm text-muted">
          Are you a student? <Link href="/login?as=student" className="text-primary underline">Student log in</Link>
        </p>
      )}
    </main>
  );
}
