import { notFound } from "next/navigation";
import { setArchived, updateAthlete } from "@/app/actions/athletes";
import { AthleteForm } from "@/components/athlete-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function AthletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: athlete } = await supabase.from("athletes").select("*").eq("id", id).maybeSingle();
  if (!athlete) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{athlete.name}</h1>
      <Card className="max-w-lg">
        <h2 className="mb-3 font-medium">Student details</h2>
        <AthleteForm action={updateAthlete.bind(null, id)} initial={athlete} submitLabel="Save changes" />
      </Card>
      <form action={setArchived.bind(null, id, !athlete.archived)}>
        <Button variant="outline" type="submit">{athlete.archived ? "Restore student" : "Archive student"}</Button>
      </form>
    </div>
  );
}
