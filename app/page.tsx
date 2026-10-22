"use client";

import { useState } from "react";
import { parseRoster } from "@/lib/parseRoster";
import { extractFrames, type ExtractedClip } from "@/lib/extractFrames";
import type { EvidenceCard as Card, Player } from "@/lib/schema";
import EvidenceCard from "@/components/EvidenceCard";
import ComparisonTable from "@/components/ComparisonTable";

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [rosterError, setRosterError] = useState("");
  const [clip, setClip] = useState<ExtractedClip | null>(null);
  const [clipUrl, setClipUrl] = useState("");
  const [clipError, setClipError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [playerIdx, setPlayerIdx] = useState("");
  const [description, setDescription] = useState("");
  const [consent, setConsent] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState("");

  async function onRoster(file?: File) {
    if (!file) return;
    const result = parseRoster(file.name, await file.text());
    setRosterError(result.error ?? "");
    setPlayers(result.players);
    setPlayerIdx("");
  }

  async function onClip(file?: File) {
    if (!file) return;
    setClip(null);
    setClipError("");
    setExtracting(true);
    try {
      setClip(await extractFrames(file));
      setClipUrl(URL.createObjectURL(file));
    } catch (e) {
      setClipError(e instanceof Error ? e.message : "This video couldn't be read.");
    } finally {
      setExtracting(false);
    }
  }

  // Demo mode: lets anyone try the app without their own files.
  async function loadDemo(clipFile: string) {
    if (players.length === 0) {
      const csv = await (await fetch("/demo/roster.csv")).text();
      await onRoster(new File([csv], "roster.csv", { type: "text/csv" }));
    }
    const blob = await (await fetch(`/demo/${clipFile}`)).blob();
    await onClip(new File([blob], clipFile, { type: "video/webm" }));
    setDescription((d) => d || "the child closest to the ball");
  }

  const player = playerIdx === "" ? null : players[Number(playerIdx)];
  const missing = [
    players.length === 0 && "upload a valid roster",
    !clip && "add a clip",
    !player && "choose a player",
    description.trim().length < 3 && "describe how to spot the player",
    !consent && "confirm consent",
  ].filter(Boolean) as string[];

  async function analyze() {
    if (!clip || !player) return;
    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player,
          description,
          consent,
          qualityOk: clip.quality.ok,
          frames: clip.frames.map((f) => ({ timestamp: f.timestamp, dataUrl: f.dataUrl })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      const card: Card = {
        id: crypto.randomUUID(),
        player,
        description: description.trim(),
        playerVisible: data.playerVisible,
        footageUsable: data.footageUsable,
        footageNote: [data.footageNote, ...clip.quality.warnings].filter(Boolean).join(" "),
        criteria: data.criteria,
        frames: clip.frames.map((f) => ({ timestamp: f.timestamp, dataUrl: f.thumb })),
        createdAt: new Date().toISOString(),
      };
      setCards((c) => [card, ...c]);
      setShareUrl("");
      setPlayerIdx("");
      setDescription("");
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function share() {
    setShareError("");
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShareUrl(`${window.location.origin}/s/${data.id}`);
    } catch (e) {
      setShareError(e instanceof Error ? e.message : "Couldn't create the link.");
    }
  }

  const box = "rounded-xl border border-gray-200 bg-white p-4 shadow-sm";
  const err = "mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-800";

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-bold">Tryout evidence cards</h1>
        <p className="text-sm text-gray-600">Upload a roster and a phone clip, then get timestamped notes for each player.</p>
      </header>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
        <h2 className="font-semibold">No files? Try the demo</h2>
        <p className="mt-1 text-gray-700">
          Loads a sample roster and a short kids&apos; football clip. Then pick a player, tick consent and press Analyze.
          Run both clips for two different players to see the comparison table.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button onClick={() => loadDemo("kids1.webm")} className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white">
            Use demo clip 1
          </button>
          <button onClick={() => loadDemo("kids2.webm")} className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white">
            Use demo clip 2
          </button>
          <a href="/demo/roster.csv" download className="text-blue-700 underline">
            Download sample roster
          </a>
        </div>
      </section>

      <section className={box}>
        <h2 className="font-semibold">1. Roster (CSV with columns: name, number)</h2>
        <input type="file" accept=".csv,text/csv" onChange={(e) => onRoster(e.target.files?.[0])} className="mt-2 block text-sm" />
        {rosterError && <p className={err}>{rosterError}</p>}
        {players.length > 0 && <p className="mt-2 text-sm text-green-700">{players.length} players loaded.</p>}
      </section>

      <section className={box}>
        <h2 className="font-semibold">2. Clip (up to 60 seconds)</h2>
        <input type="file" accept="video/*" onChange={(e) => onClip(e.target.files?.[0])} className="mt-2 block text-sm" />
        {extracting && <p className="mt-2 text-sm text-gray-600">Reading the clip…</p>}
        {clipError && <p className={err}>{clipError}</p>}
        {clip && clipUrl && (
          <>
            <video src={clipUrl} controls playsInline className="mt-3 max-h-64 rounded-lg" />
            {clip.quality.warnings.length > 0 && (
              <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                ⚠ {clip.quality.warnings.join(" ")} The result will be marked as insufficient evidence.
              </p>
            )}
          </>
        )}
      </section>

      <section className={box}>
        <h2 className="font-semibold">3. Who is this clip about?</h2>
        <select
          value={playerIdx}
          onChange={(e) => setPlayerIdx(e.target.value)}
          disabled={players.length === 0}
          className="mt-2 block w-full rounded border border-gray-300 p-2"
        >
          <option value="">Choose a player…</option>
          {players.map((p, i) => (
            <option key={i} value={i}>
              #{p.number} {p.name}
            </option>
          ))}
        </select>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="How to spot them: e.g. red bib, starts on the left wing"
          className="mt-2 block w-full rounded border border-gray-300 p-2"
        />
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
          Consent confirmed: players/parents agreed to being filmed and to this footage being analysed and shared with selectors.
        </label>
        <button
          onClick={analyze}
          disabled={missing.length > 0 || analyzing}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:bg-gray-300"
        >
          {analyzing ? "Analysing… (about 20 seconds)" : "Analyze clip"}
        </button>
        {missing.length > 0 && <p className="mt-2 text-sm text-gray-600">Still needed: {missing.join(", ")}.</p>}
        {analyzeError && <p className={err}>{analyzeError}</p>}
      </section>

      {cards.length > 0 && (
        <>
          <section className={box}>
            <h2 className="mb-2 font-semibold">Comparison</h2>
            {cards.length < 2 && <p className="mb-2 text-sm text-gray-600">Analyse at least two players to compare them.</p>}
            <ComparisonTable cards={cards} />
            <button onClick={share} className="mt-4 rounded-lg bg-gray-900 px-4 py-2 font-medium text-white">
              Create selector link
            </button>
            {shareError && <p className={err}>{shareError}</p>}
            {shareUrl && (
              <p className="mt-3 text-sm">
                Share this link (anyone with it can view):{" "}
                <a href={shareUrl} target="_blank" className="break-all text-blue-700 underline">
                  {shareUrl}
                </a>
              </p>
            )}
          </section>
          <section className="space-y-4">
            <h2 className="font-semibold">Evidence cards</h2>
            {cards.map((c) => (
              <EvidenceCard key={c.id} card={c} />
            ))}
          </section>
        </>
      )}

      <footer className="text-xs text-gray-500">
        Demo clips: &quot;Children&apos;s association football 01 and 02&quot; from Wikimedia Commons, licensed CC BY-SA 4.0.
      </footer>
    </main>
  );
}
