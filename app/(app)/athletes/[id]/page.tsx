import Link from "next/link";
import { notFound } from "next/navigation";
import { setArchived, updateAthlete } from "@/app/actions/athletes";
import { AthleteForm } from "@/components/athlete-form";
import { Button } from "@/components/ui/button";
import { UploadVideo } from "@/components/upload-video";
import { Badge, Card } from "@/components/ui/card";
import { shotLabel } from "@/sports/cricket/shots";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function AthletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: athlete } = await supabase.from("athletes").select("*").eq("id", id).maybeSingle();
  if (!athlete) notFound();
  const user = await getUser();
  const { data: videos } = await supabase
    .from("videos")
    .select("id, shot_type, taken_on, status")
    .eq("athlete_id", id)
    .order("taken_on", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{athlete.name}</h1>
      <Card className="max-w-lg">
        <h2 className="mb-3 font-medium">Upload a batting clip</h2>
        <UploadVideo athleteId={id} coachId={user!.id} />
      </Card>
      <section className="space-y-2">
        <h2 className="font-medium">Videos</h2>
        {(videos ?? []).length === 0 ? (
          <p className="text-sm text-muted">No videos yet.</p>
        ) : (
          <ul className="space-y-2">
            {videos!.map((v) => (
              <li key={v.id}>
                <Link href={`/videos/${v.id}`}>
                  <Card className="flex items-center justify-between hover:border-primary">
                    <span>{shotLabel(v.shot_type)} · {v.taken_on}</span>
                    <Badge>{v.status}</Badge>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
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
