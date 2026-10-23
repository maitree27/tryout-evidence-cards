import Link from "next/link";

/** A row of filter chips. Each chip is a link, so the page updates instantly and the back button works. */
export function Chips({ items, active }: { items: { label: string; href: string; key: string; count?: number }[]; active: string }) {
  return (
    <nav aria-label="Filter" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      {items.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          aria-current={active === c.key ? "true" : undefined}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95 ${active === c.key ? "border-transparent bg-foreground text-background" : "border-border bg-card"}`}
        >
          {c.label}
          {c.count !== undefined && <span className="ml-1.5 opacity-70">{c.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
