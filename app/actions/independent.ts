"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isAdult } from "@/lib/age";
import { NOTICE_VERSION } from "@/lib/consent";
import { createClient, getUser } from "@/lib/supabase/server";

export type IndependentState = { error?: string; notice?: string } | undefined;

const Profile = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  batting_hand: z.enum(["right", "left"]),
  dob: z.string(),
  agree: z.literal("on", { error: "Please tick the box to accept the privacy notice" }),
});

const UNDER_18 =
  "Accounts without a coach are for people aged 18 and over. If you are under 18, ask your coach for an invite link instead.";

function readProfile(formData: FormData) {
  return Profile.safeParse({
    name: formData.get("name"),
    batting_hand: formData.get("batting_hand"),
    dob: formData.get("dob"),
    agree: formData.get("agree"),
  });
}

/** Creates the student record + consent for the logged-in person. The database re-checks age and ownership. */
async function createRecord(p: z.infer<typeof Profile>, userId: string): Promise<string | null> {
  if (!isAdult(p.dob)) return UNDER_18;
  const supabase = await createClient();
  const { data: athlete, error } = await supabase
    .from("athletes")
    .insert({ name: p.name, batting_hand: p.batting_hand, date_of_birth: p.dob, is_minor: false, user_id: userId, coach_id: null })
    .select("id")
    .single();
  if (error) return error.message.includes("row-level security") ? UNDER_18 : error.message;
  const { error: cError } = await supabase.from("consents").insert({
    athlete_id: athlete.id, user_id: userId, consenter_name: p.name, consenter_role: "self_adult", notice_version: NOTICE_VERSION,
  });
  return cError ? cError.message : null;
}

/** Student sign-up page: make the login, then the profile. */
export async function studentSignup(_: IndependentState, formData: FormData): Promise<IndependentState> {
  const parsed = readProfile(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!isAdult(parsed.data.dob)) return { error: UNDER_18 };
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? "").trim(),
    password,
    options: { data: { full_name: parsed.data.name, role: "athlete" } },
  });
  if (error) return { error: error.message };
  if (!data.session || !data.user) {
    return { notice: "Account created. Confirm your email, then log in. You'll finish your profile on first login." };
  }
  const problem = await createRecord(parsed.data, data.user.id);
  if (problem) return { error: problem };
  redirect("/me");
}

/** For a logged-in athlete who has no student record yet (e.g. confirmed email later). */
export async function completeProfile(_: IndependentState, formData: FormData): Promise<IndependentState> {
  const user = await getUser();
  if (!user) redirect("/login?as=student");
  const parsed = readProfile(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const problem = await createRecord(parsed.data, user.id);
  if (problem) return { error: problem };
  redirect("/me");
}

/** Independent students can erase everything they stored: the record, clips, scores, consent and files. */
export async function deleteMyData(_: IndependentState, formData: FormData): Promise<IndependentState> {
  if (formData.get("confirm") !== "on") return { error: "Tick the box to confirm." };
  const supabase = await createClient();
  const { data: athlete } = await supabase.from("athletes").select("id, coach_id").maybeSingle();
  if (!athlete) return { error: "Nothing to delete." };
  if (athlete.coach_id) return { error: "Your coach manages this profile. Ask your coach to delete it." };
  const { data: videos } = await supabase.from("videos").select("storage_path").eq("athlete_id", athlete.id);
  const paths = (videos ?? []).flatMap((v) => (v.storage_path ? [v.storage_path, v.storage_path.replace(/\.[^./]+$/, ".keypoints.json")] : []));
  if (paths.length) {
    const { error: rmError } = await supabase.storage.from("videos").remove(paths);
    if (rmError) return { error: `Could not remove the video files: ${rmError.message}` };
  }
  const { error } = await supabase.from("athletes").delete().eq("id", athlete.id);
  if (error) return { error: error.message };
  redirect("/me");
}
