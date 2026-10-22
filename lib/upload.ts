import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";

// Supabase's free plan caps a single file at 50 MB. Raise when the plan allows more.
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 60;

/** Reads a video's length in the browser without uploading it. */
export function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This browser can't read that video. Try an MP4 or MOV from your phone."));
    };
    v.src = url;
  });
}

/** Resumable upload to the private "videos" bucket. If the connection drops it continues where it stopped. */
export async function uploadVideo(
  file: File,
  path: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You are signed out. Please log in again.");
  const projectUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const ref = projectUrl.hostname.split(".")[0];

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `https://${ref}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 2000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: "videos",
        objectName: path,
        contentType: file.type || "video/mp4",
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024,
      onError: (err) => reject(err),
      onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
      onSuccess: () => resolve(),
    });
    upload.findPreviousUploads().then((prev) => {
      if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
      upload.start();
    });
  });
}
