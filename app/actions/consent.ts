"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { NOTICE_VERSION } from "@/lib/consent";
import { createClient, getUser } from "@/lib/supabase/server";

export type ConsentState = { error?: string } | undefined;

const Schema = z.object({
  role: z.enum(["self_adult", "parent_guardian"]),
  name: z.string().trim().min(2, "Enter the full name of the person giving consent").max(100),
  agree: z.literal("on", { error: "You need to tick the box to continue" }),
});

/** An adult accepts the privacy notice for this athlete. Stored once; the database only lets the athlete's own login write it. */
export async function recordConsent(_: ConsentState, formData: FormData): Promise<ConsentState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const parsed = Schema.safeParse({ role: formData.get("role"), name: formData.get("name"), agree: formData.get("agree") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: athlete } = await supabase.from("athletes").select("id").maybeSingle();
  if (!athlete) return { error: "Your login isn't linked to a student yet." };

  const { error } = await supabase.from("consents").insert({
    athlete_id: athlete.id,
    user_id: user.id,
    consenter_name: parsed.data.name,
    consenter_role: parsed.data.role,
    notice_version: NOTICE_VERSION,
  });
  if (error && !error.message.includes("duplicate")) return { error: error.message };
  redirect("/me");
}
