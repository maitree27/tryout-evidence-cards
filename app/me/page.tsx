import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient, getRole, getUser } from "@/lib/supabase/server";

// Athlete home (placeholder for now): later this becomes the feed with uploads, streaks and personal bests.
export default async function AthleteHome() {
  const user = await getUser();
  if (!user) redirect("/login");
  if ((await getRole()) !== "athlete") redirect("/");

  const supabase = await createClient();
  // Row-level security returns only the student record linked to this login.
  const { data: athlete } = await supabase.from("athletes").select("name").maybeSingle();

  return (
    <div className="min-h-screen">
      <header className="bg-foreground text-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="font-display text-3xl tracking-wide">WILLOW</span>
          <form action={logout}>
            <Button variant="ghost" type="submit" className="hover:bg-white/15">Log out</Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <h1 className="text-4xl">{athlete ? `Hi ${athlete.name}` : "Welcome"}</h1>
        <Card>
          {athlete ? (
            <p className="text-sm">Your coach has set you up. Uploading clips and seeing your feedback is coming next.</p>
          ) : (
            <p className="text-sm">Your login isn&apos;t linked to a coach yet. Ask your coach to send you an invite link.</p>
          )}
        </Card>
      </main>
    </div>
  );
}
