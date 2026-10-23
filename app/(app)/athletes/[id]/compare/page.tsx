import Link from "next/link";
import { notFound } from "next/navigation";
import { CompareView } from "@/components/compare-view";
import { createClient } from "@/lib/supabase/server";

export default async function CoachCompare({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ a?: string; b?: string }> }) {
  const { id } = await params;
  const { a, b } = await searchParams;
  const supabase = await createClient();
  const { data: athlete } = await supabase.from("athletes").select("id, name").eq("id", id).maybeSingle();
  if (!athlete) notFound();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 pt-6">
      <Link href={`/athletes/${id}`} className="text-sm text-muted hover:text-foreground">← {athlete.name}</Link>
      <h1 className="text-3xl">Compare two clips</h1>
      <CompareView supabase={supabase} athleteId={id} a={a} b={b} action={`/athletes/${id}/compare`} />
    </div>
  );
}
