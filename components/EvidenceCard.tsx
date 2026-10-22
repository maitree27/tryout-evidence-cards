import { CRITERIA, type Rating } from "@/lib/criteria";
import type { EvidenceCard as Card } from "@/lib/schema";

export const RATING_STYLE: Record<Rating, string> = {
  strong: "bg-green-100 text-green-800",
  developing: "bg-amber-100 text-amber-800",
  limited: "bg-orange-100 text-orange-800",
  cant_tell: "bg-gray-200 text-gray-700",
};
export const RATING_LABEL: Record<Rating, string> = {
  strong: "Strong",
  developing: "Developing",
  limited: "Limited",
  cant_tell: "Can't tell",
};

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function nearestFrame(card: Card, t: number) {
  return card.frames.reduce((best, f) => (Math.abs(f.timestamp - t) < Math.abs(best.timestamp - t) ? f : best), card.frames[0]);
}

export default function EvidenceCard({ card }: { card: Card }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <header>
        <h3 className="text-lg font-semibold">
          #{card.player.number} {card.player.name}
        </h3>
        <p className="text-sm text-gray-600">Spotted as: {card.description}</p>
        <p className="text-xs text-gray-500">
          AI-assisted, based on {card.frames.length} sampled moments from the clip. Check the frames to confirm it is the right player.
        </p>
      </header>

      {!card.playerVisible && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          The player could not be found in this clip, so nothing is attributed to them.
        </p>
      )}
      {!card.footageUsable && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Insufficient evidence: the footage was not clear enough. {card.footageNote}
        </p>
      )}

      <div className="mt-4 space-y-4">
        {CRITERIA.map((c) => {
          const r = card.criteria.find((x) => x.id === c.id)!;
          return (
            <section key={c.id}>
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{c.label}</h4>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RATING_STYLE[r.rating]}`}>
                  {RATING_LABEL[r.rating]}
                </span>
                {r.insufficient && <span className="text-xs text-amber-700">⚠ insufficient evidence</span>}
              </div>
              <p className="text-sm text-gray-600">{r.reason}</p>
              <ul className="mt-2 space-y-2">
                {r.observations.map((o, i) => {
                  const frame = nearestFrame(card, o.timestamp);
                  return (
                    <li key={i} className="flex gap-3 text-sm">
                      {frame && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={frame.dataUrl} alt={`Frame at ${fmtTime(o.timestamp)}`} className="h-14 w-24 rounded object-cover" />
                      )}
                      <div>
                        <span className="font-mono">{fmtTime(o.timestamp)}</span>{" "}
                        <span className="text-gray-500">({Math.round(o.confidence * 100)}% confident)</span>
                        <p>{o.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </article>
  );
}
