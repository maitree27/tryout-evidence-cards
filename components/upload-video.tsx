"use client";

import { FilmingGuide } from "@/components/filming-guide";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, readDuration, uploadVideo } from "@/lib/upload";
import { SHOT_TYPES } from "@/sports/cricket/shots";

/**
 * `folderOwnerId` is the coach's id (videos are stored under <coach>/<athlete>/). `uploaderId` is whoever is logged in:
 * the coach, or the athlete themselves.
 */
export function UploadVideo({ athleteId, folderOwnerId, uploaderId, afterUpload = "/videos", dailyLimit }: { athleteId: string; folderOwnerId: string; uploaderId: string; afterUpload?: string; dailyLimit?: number }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState<number | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const form = new FormData(e.currentTarget);
    if (!file) return setError("Choose a video first.");
    if (!file.type.startsWith("video/")) return setError("That file isn't a video.");
    if (file.size > MAX_VIDEO_BYTES)
      return setError(
        `That file is ${(file.size / 1048576).toFixed(0)} MB. The limit is ${MAX_VIDEO_BYTES / 1048576} MB. Trim it to the single shot or lower the phone's video quality.`,
      );
    try {
      setProgress(0);
      if (dailyLimit) {
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { count } = await createClient().from("videos").select("id", { count: "exact", head: true }).eq("athlete_id", athleteId).gte("created_at", since);
        if ((count ?? 0) >= dailyLimit) throw new Error(`You've reached today's limit of ${dailyLimit} clips. Please try again tomorrow.`);
      }
      const duration = await readDuration(file);
      if (duration > MAX_VIDEO_SECONDS)
        throw new Error(`That clip is ${Math.round(duration)}s. Keep it under ${MAX_VIDEO_SECONDS}s (one shot or a short drill).`);

      const videoId = crypto.randomUUID();
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${folderOwnerId}/${athleteId}/${videoId}.${ext}`;
      await uploadVideo(file, path, setProgress);

      const supabase = createClient();
      const { error: dbError } = await supabase.from("videos").insert({
        id: videoId,
        athlete_id: athleteId,
        uploaded_by: uploaderId,
        storage_path: path,
        shot_type: form.get("shot_type"),
        taken_on: form.get("taken_on"),
        duration_s: duration,
        status: "uploaded",
      });
      if (dbError) {
        throw new Error(
          dbError.message.includes("row-level security")
            ? "Couldn't save this clip. You may have reached today's upload limit, or your consent is missing."
            : dbError.message,
        );
      }
      router.push(`${afterUpload}/${videoId}`);
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : "Upload failed. Check your connection and try again.");
    }
  }

  const uploading = progress !== null;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FilmingGuide />
      <Field label="Batting clip" hint={`MP4/MOV, up to ${MAX_VIDEO_BYTES / 1048576} MB and ${MAX_VIDEO_SECONDS}s. Filmed side-on, phone held steady.`}>
        <Input type="file" accept="video/*" disabled={uploading} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Shot / drill">
          <Select name="shot_type" defaultValue="drill" disabled={uploading}>
            {SHOT_TYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Date filmed">
          <Input type="date" name="taken_on" required defaultValue={new Date().toISOString().slice(0, 10)} disabled={uploading} />
        </Field>
      </div>
      {uploading && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full bg-success transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted">Uploading… {progress}% (it resumes automatically if your signal drops)</p>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={uploading}>{uploading ? "Uploading…" : "Upload video"}</Button>
    </form>
  );
}
