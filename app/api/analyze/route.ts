import { NextResponse } from "next/server";
import { z } from "zod";
import { writeFeedback } from "@/lib/analysis/feedback";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getRole, getUser } from "@/lib/supabase/server";
import { analyzeBatting } from "@/sports/cricket/batting";

export const maxDuration = 60;

// The browser sends only body keypoints (never trusted scores). Scores are computed here.
const Body = z.object({
  videoId: z.string().uuid(),
  aspect: z.number().min(0.2).max(5),
  cameraSpan: z.number().min(0).max(10).optional(),
  frames: z
    .array(
      z.object({
        t: z.number().min(0).max(600),
        lm: z.array(z.tuple([z.number(), z.number(), z.number()])).length(33).nullable(),
        cam: z.tuple([z.number(), z.number()]).optional(),
      }),
    )
    .min(1)
    .max(1000),
});

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { videoId, aspect, frames, cameraSpan } = parsed.data;

  const supabase = await createClient();
  // Row-level security makes this return nothing unless the video belongs to this coach's student.
  const { data: video } = await supabase
    .from("videos")
    .select("id, athlete_id, shot_type, storage_path, athletes(batting_hand)")
    .eq("id", videoId)
    .maybeSingle();
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  const hand = (video.athletes as unknown as { batting_hand: "right" | "left" }).batting_hand;

  await supabase.from("videos").update({ status: "analyzing" }).eq("id", videoId);

  const result = analyzeBatting(frames, aspect, hand, video.shot_type, cameraSpan);
  if (result.overall === null) {
    await supabase.from("videos").update({ status: "failed" }).eq("id", videoId);
    return NextResponse.json({ ok: false, warnings: result.quality.warnings }, { status: 422 });
  }

  const feedback = await writeFeedback(result, video.shot_type, hand);

  // Keypoints are kept (private bucket) next to the video so the outline overlay can be drawn without re-analysing.
  if (video.storage_path) {
    await supabase.storage
      .from("videos")
      .upload(video.storage_path.replace(/\.[^./]+$/, ".keypoints.json"), JSON.stringify({ aspect, frames }), {
        contentType: "application/json",
        upsert: true,
      });
  }

  // Coaches save with their own session. Athletes have no write access to scores (so they can't forge them):
  // their access to this video was just verified above, so the server saves on their behalf.
  const role = await getRole();
  let writer = supabase;
  if (role === "athlete") {
    try {
      writer = createAdminClient() as unknown as typeof supabase;
    } catch {
      await supabase.from("videos").update({ status: "failed" }).eq("id", videoId);
      return NextResponse.json({ error: "Server is not set up to save athlete results yet." }, { status: 500 });
    }
  }

  const { error } = await writer.from("analyses").upsert(
    {
      video_id: videoId,
      config_version: result.configVersion,
      overall: result.overall,
      metrics: result.metrics,
      quality: result.quality,
      feedback: feedback.text,
      feedback_model: feedback.model,
    },
    { onConflict: "video_id" },
  );
  if (error) {
    await supabase.from("videos").update({ status: "failed" }).eq("id", videoId);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await supabase.from("videos").update({ status: "analyzed" }).eq("id", videoId);
  return NextResponse.json({ ok: true, overall: result.overall });
}
