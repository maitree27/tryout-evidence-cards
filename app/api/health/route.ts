import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public status check. Reports ONLY true/false, never any value or data.
export const dynamic = "force-dynamic";

// Describes the SHAPE of the stored server key (never its characters) so setup mistakes can be found.
function keyShape(key: string | undefined) {
  if (!key) return null;
  return {
    startsWithSbSecret: key.startsWith("sb_secret_"),
    startsWithSbPublishable: key.startsWith("sb_publishable_"),
    looksLikeOldJwtKey: key.startsWith("eyJ"),
    length: key.length,
    hasWhitespace: /\s/.test(key),
    hasQuotes: /["']/.test(key),
    hasDots: key.includes("•") || key.includes("…") || key.includes("..."),
  };
}

export async function GET() {
  let serverKeyWorks = false;
  let serverKeyProblem: string | null = null;
  try {
    // Reads zero rows: only proves the server key is accepted by the database.
    const { error } = await createAdminClient().from("invites").select("id").limit(0);
    serverKeyWorks = !error;
    serverKeyProblem = error ? String(error.message).slice(0, 120) : null;
  } catch {
    serverKeyWorks = false;
    serverKeyProblem = "could not create the client";
  }
  return NextResponse.json({
    app: "willow",
    settings: {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabasePublicKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServerKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseServerKeyWorks: serverKeyWorks,
      supabaseServerKeyProblem: serverKeyProblem,
      supabaseServerKeyShape: keyShape(process.env.SUPABASE_SERVICE_ROLE_KEY),
      openai: !!process.env.OPENAI_API_KEY,
    },
  });
}
