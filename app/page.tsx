import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { getRole, getUser } from "@/lib/supabase/server";

// Public front door. Logged-in people go straight to their own area.
export default async function Landing() {
  const user = await getUser();
  if (user) {
    const role = await getRole();
    if (role === "athlete") redirect("/me");
    if (role === "coach") redirect("/dashboard");
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 pt-5">
        <span className="text-[17px] font-semibold tracking-tight">Willow</span>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex max-w-xl flex-col gap-8 px-5 pb-12 pt-10">
        <section>
          <p className="text-sm text-muted">Batting analysis for cricket</p>
          <h1 className="mt-2 text-5xl leading-[1.05] sm:text-6xl">Film it.<br />Score it.<br />Improve it.</h1>
          <p className="mt-4 max-w-md text-base text-muted">A coach films a clip, Willow scores the technique, and players watch their progress grow week by week.</p>
        </section>

        <section aria-label="Choose how to log in" className="grid gap-3">
          <div className="tile tile-blue flex flex-col gap-5 p-5">
            <div>
              <div className="text-sm opacity-90">For coaches</div>
              <h2 className="mt-1 text-2xl font-semibold" style={{ color: "var(--tile-fg)", fontSize: "1.5rem", lineHeight: 1.2 }}>I&apos;m a coach</h2>
              <p className="mt-1 text-sm opacity-90">Manage your students, review scores and see who needs you.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/login" className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition active:scale-95">Log in</Link>
              <Link href="/signup" className="inline-flex min-h-11 items-center rounded-full border border-current px-6 text-sm font-medium transition active:scale-95">Create account</Link>
            </div>
          </div>

          <div className="tile tile-pink flex flex-col gap-5 p-5">
            <div>
              <div className="text-sm opacity-90">For players</div>
              <h2 className="mt-1 text-2xl font-semibold" style={{ color: "var(--tile-fg)", fontSize: "1.5rem", lineHeight: 1.2 }}>I&apos;m a student</h2>
              <p className="mt-1 text-sm opacity-90">See your scores and feedback, and track your streak and personal bests.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/login?as=student" className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition active:scale-95">Log in</Link>
              <Link href="/signup/student" className="inline-flex min-h-11 items-center rounded-full border border-current px-6 text-sm font-medium transition active:scale-95">Create account</Link>
            </div>
            <p className="text-xs opacity-90">Got an invite from your coach? Open that link. No coach? Create an account (18+).</p>
          </div>
        </section>

        <footer className="text-center text-xs text-muted"><Link href="/privacy" className="underline underline-offset-4">Privacy</Link></footer>
      </main>
    </div>
  );
}
