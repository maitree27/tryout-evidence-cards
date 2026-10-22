import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { shotLabel } from "@/sports/cricket/shots";

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: video } = await supabase
    .from("videos")
    .select("*, athletes(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!video) notFound();

  // Videos are private: the only way to watch is a link that expires in an hour.
  const { data: signed } = await supabase.storage.from("videos").createSignedUrl(video.storage_path, 3600);

  return (
    <div className="space-y-4">
      <Link href={`/athletes/${video.athletes.id}`} className="text-sm text-primary underline">
        ← {video.athletes.name}
      </Link>
      <h1 className="text-2xl font-semibold">{shotLabel(video.shot_type)}</h1>
      <div className="flex gap-2 text-sm text-muted">
        <span>{video.taken_on}</span>
        <Badge>{video.status}</Badge>
      </div>
      <Card className="p-0 overflow-hidden">
        {signed?.signedUrl ? (
          <video src={signed.signedUrl} controls playsInline className="max-h-[70vh] w-full bg-black" />
        ) : (
          <p className="p-4 text-sm text-danger">Couldn&apos;t load the video.</p>
        )}
      </Card>
    </div>
  );
}
