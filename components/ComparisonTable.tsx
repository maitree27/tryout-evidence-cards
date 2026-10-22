import { CRITERIA } from "@/lib/criteria";
import type { EvidenceCard } from "@/lib/schema";
import { RATING_LABEL, RATING_STYLE } from "./EvidenceCard";

export default function ComparisonTable({ cards }: { cards: EvidenceCard[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-300 text-left">
            <th className="p-2">Player</th>
            {CRITERIA.map((c) => (
              <th key={c.id} className="p-2">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card.id} className="border-b border-gray-200 align-top">
              <td className="p-2 font-medium">
                #{card.player.number} {card.player.name}
                {(!card.playerVisible || !card.footageUsable) && (
                  <div className="text-xs font-normal text-red-700">⚠ unclear footage</div>
                )}
              </td>
              {CRITERIA.map((c) => {
                const r = card.criteria.find((x) => x.id === c.id)!;
                return (
                  <td key={c.id} className="p-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RATING_STYLE[r.rating]}`}>
                      {RATING_LABEL[r.rating]}
                    </span>
                    {r.insufficient && <div className="mt-1 text-xs text-amber-700">⚠ insufficient evidence</div>}
                    <div className="mt-1 text-xs text-gray-500">{r.observations.length} observation(s)</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
