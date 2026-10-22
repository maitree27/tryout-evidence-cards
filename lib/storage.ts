import { promises as fs } from "fs";
import path from "path";
import { put, list } from "@vercel/blob";
import type { SharedReport } from "./schema";

// On Vercel (token present) reports go to Vercel Blob.
// On your own computer they are saved as files in the .data folder.
const blobEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const dataDir = path.join(process.cwd(), ".data");

export const isValidId = (id: string) => /^[a-f0-9-]{36}$/.test(id);

export async function saveReport(report: SharedReport): Promise<string> {
  const id = crypto.randomUUID();
  const json = JSON.stringify(report);
  if (blobEnabled()) {
    await put(`reports/${id}.json`, json, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
  } else {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, `${id}.json`), json);
  }
  return id;
}

export async function loadReport(id: string): Promise<SharedReport | null> {
  if (!isValidId(id)) return null;
  try {
    if (blobEnabled()) {
      const { blobs } = await list({ prefix: `reports/${id}.json`, limit: 1 });
      if (!blobs[0]) return null;
      const res = await fetch(blobs[0].url, { cache: "no-store" });
      return res.ok ? ((await res.json()) as SharedReport) : null;
    }
    return JSON.parse(await fs.readFile(path.join(dataDir, `${id}.json`), "utf8"));
  } catch {
    return null;
  }
}
