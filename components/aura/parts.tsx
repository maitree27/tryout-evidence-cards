import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TileColor = "pink" | "green" | "blue" | "orange" | "violet";

/** A colourful tile with one tiny label and one big dotted number. */
export function Tile({ color, label, value, note, className, href }: { color: TileColor; label: string; value: ReactNode; note?: string; className?: string; href?: string }) {
  const classes = cn("tile", `tile-${color}`, href && "transition active:scale-[0.97] hover:opacity-95", className);
  const Wrapper = ({ children }: { children: ReactNode }) =>
    href ? <Link href={href} className={cn(classes, "block")}>{children}</Link> : <div className={classes}>{children}</div>;
  return (
    <Wrapper>
      <div className="text-xs opacity-90">{label}</div>
      <div className="dot mt-1 text-[2.25rem]">{value}</div>
      {note && <div className="mt-1 text-xs opacity-90">{note}</div>}
    </Wrapper>
  );
}

/** The hero number on a screen. */
export function BigNumber({ label, value, note, size = "text-[6.5rem]" }: { label: string; value: ReactNode; note?: ReactNode; size?: string }) {
  return (
    <section className="text-center">
      <div className="text-sm text-muted">{label}</div>
      <div className={cn("dot mt-1.5", size)}>{value}</div>
      {note && <div className="mt-1 text-sm text-muted">{note}</div>}
    </section>
  );
}

/** A soft line through a series of numbers (0-100). Decorative: the numbers are shown elsewhere. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const w = 340, h = 44, pad = 6;
  const pts = values.map((v, i) => [pad + (i * (w - pad * 2)) / (values.length - 1), h - pad - (Math.max(0, Math.min(100, v)) / 100) * (h - pad * 2)]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} aria-hidden="true" className={cn("text-success", className)}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="4.5" fill="currentColor" />
    </svg>
  );
}

/** The one main action at the bottom of a screen: a glassy pill with a round plus. */
export function PillLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="mx-auto flex w-fit items-center gap-4 rounded-full border border-border bg-card py-2 pl-7 pr-2 text-[15px] font-medium backdrop-blur hover:opacity-90"
    >
      {children}
      <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xl text-primary-foreground">+</span>
    </Link>
  );
}

/** A soft glassy row: coloured dot, name + one short note, score on the right. */
export function StudentRow({ href, name, note, score, tone }: { href: string; name: string; note: string; score: ReactNode; tone: "good" | "warn" | "bad" | "none" }) {
  const dot = { good: "var(--success)", warn: "var(--warning)", bad: "var(--danger)", none: "var(--muted)" }[tone];
  return (
    <Link href={href} className="glass flex items-center gap-3 px-4 py-3 hover:opacity-90">
      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dot, boxShadow: `0 0 12px ${dot}` }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{name}</span>
        <span className="block truncate text-xs text-muted">{note}</span>
      </span>
      <span className="dot text-[1.75rem]">{score}</span>
    </Link>
  );
}
