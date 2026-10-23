import Link from "next/link";
import { CompareView } from "@/components/compare-view";
import { createClient } from "@/lib/supabase/server";

export default async function MeCompare({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { a, b } = await searchParams;
  const supabase = await createClient();
  const { data: athlete } = await supabase.from("athletes").select("id").maybeSingle();
  if (!athlete) return null;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 pt-6">
      <Link href="/me/clips" className="text-sm text-muted hover:text-foreground">← Clips</Link>
      <h1 className="text-3xl">Compare two clips</h1>
      <CompareView supabase={supabase} athleteId={athlete.id} a={a} b={b} action="/me/compare" />
    </div>
  );
}
