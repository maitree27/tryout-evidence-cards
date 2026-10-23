import { AuthShell } from "@/components/aura/auth-shell";
import { JoinForm } from "@/components/join-form";
import { Card } from "@/components/ui/card";
import { createClient, getRole, getUser } from "@/lib/supabase/server";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { token } = await params;
  const { mode } = await searchParams;
  const supabase = await createClient();

  // Safe for anyone to call: it only reveals the student's first name and the coach's name for a valid token.
  const { data } = await supabase.rpc("get_invite_info", { p_token: token });
  const info = (data as { athlete_name: string; coach_name: string | null; valid: boolean }[] | null)?.[0];

  const user = await getUser();
  const role = user ? await getRole() : null;

  return (
    <AuthShell title="Join Willow" back="/">
      {!info || !info.valid ? (
        <Card className="text-sm">This invite link isn&apos;t valid any more. It may have expired or already been used. Ask your coach for a new one.</Card>
      ) : role === "coach" ? (
        <Card className="text-sm">You&apos;re signed in as a coach. Student invites can only be accepted with a student account. Open this link in a private window.</Card>
      ) : (
        <>
          <p className="text-sm text-muted">
            {info.coach_name ?? "Your coach"} invited you to Willow as <strong className="text-foreground">{info.athlete_name}</strong>. Your videos and results stay private to you and your coach.
          </p>
          <Card>
            <JoinForm token={token} mode={role === "athlete" ? "accept" : mode === "login" ? "login" : "signup"} defaultName={info.athlete_name} />
          </Card>
        </>
      )}
    </AuthShell>
  );
}
