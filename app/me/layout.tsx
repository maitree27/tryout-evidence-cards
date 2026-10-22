import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { ConsentForm } from "@/components/consent-form";
import { Card } from "@/components/ui/card";
import { createClient, getRole, getUser } from "@/lib/supabase/server";

// Everything under /me is the athlete's own area. Row-level security does the real protection; this keeps coaches out of the wrong screens.
export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  if ((await getRole()) !== "athlete") redirect("/");

  // Nothing in the athlete area is shown until an adult has accepted the privacy notice for this student.
  const supabase = await createClient();
  const { data: athlete } = await supabase.from("athletes").select("id, name, is_minor").maybeSingle();
  const { data: consent } = athlete ? await supabase.from("consents").select("id").eq("athlete_id", athlete.id).maybeSingle() : { data: null };
  const needsConsent = !!athlete && !consent;

  return (
    <div className="min-h-screen">
      <header className="bg-foreground text-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <Link href="/me" className="font-display text-3xl tracking-wide">WILLOW</Link>
          <nav className="flex items-center gap-1">
            {!needsConsent && <>
            <Link href="/me/progress" className="px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:bg-white/15">Progress</Link>
            <Link href="/me/upload" className="px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:bg-white/15">Upload</Link></>}
            <form action={logout}>
              <Button variant="ghost" type="submit" className="hover:bg-white/15">Log out</Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">{needsConsent && athlete ? (
          <>
            <h1 className="text-4xl">One quick step</h1>
            <p className="text-sm text-muted">
              Willow stores videos and results for {athlete.name}. Before anything else, an adult needs to accept how that data is handled.
              {athlete.is_minor && " Because this player is under 18, a parent or guardian must do this."}
            </p>
            <Card><ConsentForm studentName={athlete.name} isMinor={athlete.is_minor} /></Card>
          </>
        ) : children}</main>
    </div>
  );
}
