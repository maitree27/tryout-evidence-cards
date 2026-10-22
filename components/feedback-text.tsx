// Renders the small Markdown subset the feedback uses: **Heading** lines and "- " bullets.
export function FeedbackText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-3 text-sm">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const head = lines[0].match(/^\*\*(.+?)\*\*\s*(.*)$/);
        const body = head ? [head[2], ...lines.slice(1)].filter(Boolean) : lines;
        const bullets = body.filter((l) => l.startsWith("- "));
        const prose = body.filter((l) => !l.startsWith("- "));
        return (
          <div key={i}>
            {head && <h3 className="font-semibold">{head[1]}</h3>}
            {prose.map((l, k) => <p key={k}>{l}</p>)}
            {bullets.length > 0 && (
              <ul className="list-disc space-y-1 pl-5">
                {bullets.map((l, k) => <li key={k}>{l.slice(2).replace(/\*\*/g, "")}</li>)}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
