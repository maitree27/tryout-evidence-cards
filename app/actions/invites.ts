"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";

export type InviteState = { error?: string; ok?: string } | undefined;

/** Coach invites a student by email. Only that email can accept it. */
export async function createInvite(athleteId: string, _: InviteState, formData: FormData): Promise<InviteState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const email = z.string().trim().toLowerCase().email("Enter a valid email address").safeParse(formData.get("email"));
  if (!email.success) return { error: email.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("invites").insert({ athlete_id: athleteId, email: email.data, created_by: user.id });
  if (error) return { error: error.message };
  revalidatePath(`/athletes/${athleteId}`);
  return { ok: "Invite created. Copy the link below and send it to your student." };
}

export async function revokeInvite(inviteId: string, athleteId: string) {
  const supabase = await createClient();
  await supabase.from("invites").delete().eq("id", inviteId);
  revalidatePath(`/athletes/${athleteId}`);
}

/**
 * The student's side: sign up (or log in, or just accept if already signed in as an athlete) and
 * attach the login to the student record. The database checks the invite, the expiry and that the
 * email matches; nothing here is trusted.
 */
export async function joinWithInvite(token: string, mode: "signup" | "login" | "accept", _: InviteState, formData: FormData): Promise<InviteState> {
  const supabase = await createClient();

  if (mode !== "accept") {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (mode === "signup") {
      if (password.length < 8) return { error: "Password must be at least 8 characters." };
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: String(formData.get("name") ?? "").trim(), role: "athlete" } },
      });
      if (error) return { error: error.message };
      if (!data.session) return { error: "Account created. Confirm your email, then open this invite link again." };
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
    }
  }

  const { error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) return { error: error.message };
  redirect("/me");
}
