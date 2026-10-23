import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-header";
import { ConsentForm } from "@/components/consent-form";
import { StudentSignupForm } from "@/components/student-signup-form";
import { Card } from "@/components/ui/card";
import { createClient, getRole, getUser } from "@/lib/supabase/server";

// Everything under /me is the student's own area. Row-level security does the real protection; this keeps coaches out of the wrong screens.
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  if ((await getRole()) !== "athlete") redirect("/");

  // Nothing in the student area is shown until an adult has accepted the privacy notice for this student.
  const supabase = await createClient();
  const { data: athlete } = await supabase.from("athletes").select("id, name, is_minor").maybeSingle();
  const { data: consent } = athlete ? await supabase.from("consents").select("id").eq("athlete_id", athlete.id).maybeSingle() : { data: null };
  const needsConsent = !!athlete && !consent;
  const needsSetup = !athlete; // signed up but no student profile yet

  return (
    <AppShell role="student" homeHref="/me">
      {needsSetup ? (
        <main className="mx-auto max-w-xl space-y-4 px-5 py-8">
          <h1 className="text-3xl">Set up your profile</h1>
          <p className="text-sm text-muted">A few details to finish your account. If your coach sent you an invite link, open that link instead.</p>
          <Card><StudentSignupForm mode="complete" /></Card>
        </main>
      ) : needsConsent && athlete ? (
        <main className="mx-auto max-w-xl space-y-4 px-5 py-8">
          <h1 className="text-3xl">One quick step</h1>
          <p className="text-sm text-muted">
            Willow stores videos and results for {athlete.name}. Before anything else, an adult needs to accept how that data is handled.
            {athlete.is_minor && " Because this player is under 18, a parent or guardian must do this."}
          </p>
          <Card><ConsentForm studentName={athlete.name} isMinor={athlete.is_minor} /></Card>
        </main>
      ) : (
        children
      )}
    </AppShell>
  );
}
