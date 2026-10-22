"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";

const AthleteSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  batting_hand: z.enum(["right", "left"]),
  date_of_birth: z.string().optional(),
  is_minor: z.boolean(),
  notes: z.string().trim().max(2000).optional(),
});

export type FormState = { error?: string } | undefined;

function parse(formData: FormData) {
  return AthleteSchema.safeParse({
    name: formData.get("name"),
    batting_hand: formData.get("batting_hand"),
    date_of_birth: (formData.get("date_of_birth") as string) || undefined,
    is_minor: formData.get("is_minor") === "on",
    notes: (formData.get("notes") as string) || undefined,
  });
}

export async function createAthlete(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("athletes")
    .insert({ ...parsed.data, date_of_birth: parsed.data.date_of_birth ?? null, coach_id: user.id })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/");
  redirect(`/athletes/${data.id}`);
}

export async function updateAthlete(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("athletes")
    .update({ ...parsed.data, date_of_birth: parsed.data.date_of_birth ?? null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/athletes/${id}`);
  revalidatePath("/");
  return undefined;
}

export async function setArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  await supabase.from("athletes").update({ archived }).eq("id", id);
  revalidatePath("/");
  revalidatePath(`/athletes/${id}`);
}
