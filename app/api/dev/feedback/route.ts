// DEV-ONLY: lets the /lab page check the feedback writer without logging in.
import { NextResponse } from "next/server";
import { writeFeedback } from "@/lib/analysis/feedback";
import type { AnalysisResult } from "@/sports/types";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });
  const { result, shotType } = (await req.json()) as { result: AnalysisResult; shotType: string };
  return NextResponse.json(await writeFeedback(result, shotType, "right"));
}
