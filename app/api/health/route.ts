import { NextResponse } from "next/server";

// Public status check. Reports ONLY whether each setting exists (true/false), never any value.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    app: "willow",
    settings: {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabasePublicKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServerKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      openai: !!process.env.OPENAI_API_KEY,
    },
  });
}
