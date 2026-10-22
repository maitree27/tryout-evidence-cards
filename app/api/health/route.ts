import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public status check. Reports ONLY true/false, never any value or data.
export const dynamic = "force-dynamic";

export async function GET() {
  let serverKeyWorks = false;
  try {
    // Reads zero rows: only proves the server key is accepted by the database.
    const { error } = await createAdminClient().from("invites").select("id").limit(0);
    serverKeyWorks = !error;
  } catch {
    serverKeyWorks = false;
  }
  return NextResponse.json({
    app: "willow",
    settings: {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabasePublicKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServerKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseServerKeyWorks: serverKeyWorks,
      openai: !!process.env.OPENAI_API_KEY,
    },
  });
}
