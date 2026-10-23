import { redirect } from "next/navigation";
import { UploadVideo } from "@/components/upload-video";
import { Card } from "@/components/ui/card";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function AthleteUpload() {
  const user = await getUser();
  const supabase = await createClient();
  const { data: athlete } = await supabase.from("athletes").select("id, coach_id").maybeSingle();
  if (!user || !athlete) redirect("/me");
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 pt-6">
      <h1 className="text-3xl">Upload a clip</h1>
      <Card>
        <UploadVideo athleteId={athlete.id} folderOwnerId={athlete.coach_id ?? user.id} uploaderId={user.id} afterUpload="/me/videos" dailyLimit={athlete.coach_id ? undefined : 5} />
      </Card>
    </div>
  );
}
