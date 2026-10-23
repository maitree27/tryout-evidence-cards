import Link from "next/link";
import { redirect } from "next/navigation";
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
    <main className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-5xl flex-col px-4 py-8">
      <header className="flex items-center justify-between">
        <span className="font-display text-4xl tracking-wide">WILLOW</span>
        <Link href="/privacy" className="font-mono text-xs font-bold uppercase tracking-wider underline">Privacy</Link>
      </header>

      <section className="my-10 sm:my-16">
        <h1 className="text-6xl leading-[0.95] sm:text-8xl">
          Film.<br />
          <span className="text-primary">Score.</span><br />
          <span className="text-accent">Improve.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg">
          Batting analysis for cricket. A coach films a clip, Willow scores the technique, and players watch their progress week by week.
        </p>
      </section>

      <section aria-label="Choose how to log in" className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col justify-between gap-6 bg-foreground p-6 text-background">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-accent">For coaches</p>
            <h2 className="mt-2" style={{ fontFamily: "var(--font-anton), Impact, sans-serif", fontSize: "2.5rem", lineHeight: 1, letterSpacing: "normal", textTransform: "none", fontWeight: 400 }}>I&apos;m a coach</h2>
            <p className="mt-2 text-sm opacity-90">Manage your students, upload clips, review scores and see who needs your attention.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/login" className="inline-flex min-h-11 items-center bg-primary px-5 font-mono text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-background hover:text-foreground">Coach log in</Link>
            <Link href="/signup" className="inline-flex min-h-11 items-center border-2 border-background px-5 font-mono text-xs font-bold uppercase tracking-wider hover:bg-background hover:text-foreground">Create coach account</Link>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-6 border-2 border-border bg-card p-6">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">For players</p>
            <h2 className="mt-2" style={{ fontFamily: "var(--font-anton), Impact, sans-serif", fontSize: "2.5rem", lineHeight: 1, letterSpacing: "normal", textTransform: "none", fontWeight: 400 }}>I&apos;m a student</h2>
            <p className="mt-2 text-sm">See your scores and feedback, track your streak and personal bests. Got an invite from your coach? Open it to join. No coach? Create your own account (18+) for personal use.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/login?as=student" className="inline-flex min-h-11 items-center bg-accent px-5 font-mono text-xs font-bold uppercase tracking-wider text-foreground hover:bg-foreground hover:text-background">Student log in</Link>
            <Link href="/signup/student" className="inline-flex min-h-11 items-center border-2 border-border px-5 font-mono text-xs font-bold uppercase tracking-wider hover:bg-foreground hover:text-background">Create account</Link>
          </div>
          <p className="text-xs text-muted">Have a coach? Use the invite link they sent you. No invite? Create an account (18+). Already joined? Just log in.</p>
        </div>
      </section>
    </main>
  );
}
