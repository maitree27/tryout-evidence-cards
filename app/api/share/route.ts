import { NextResponse } from "next/server";
import { saveReport } from "@/lib/storage";
import type { EvidenceCard } from "@/lib/schema";

export async function POST(req: Request) {
  let body: { cards?: EvidenceCard[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "That request was unreadable." }, { status: 400 });
  }
  const cards = body.cards;
  if (!Array.isArray(cards) || cards.length < 1 || cards.length > 30) {
    return NextResponse.json({ error: "Add at least one evidence card before sharing." }, { status: 400 });
  }
  try {
    const id = await saveReport({ cards, createdAt: new Date().toISOString() });
    return NextResponse.json({ id });
  } catch (e) {
    console.error("Share failed", e);
    return NextResponse.json({ error: "Couldn't save the report. Please try again." }, { status: 500 });
  }
}
