// Decorative scrolling strip at the very top (Kinetic look). Hidden from screen readers; stops for people who prefer reduced motion.
export function Ticker() {
  const line = "WILLOW ★ FILM IT ★ SCORE IT ★ FIX IT ★ ";
  return (
    <div aria-hidden="true" className="overflow-hidden whitespace-nowrap bg-foreground py-2 font-display text-sm tracking-[0.12em] text-background">
      <div className="ticker-track flex w-max">
        <span className="pr-10">{line.repeat(6)}</span>
        <span className="pr-10">{line.repeat(6)}</span>
      </div>
    </div>
  );
}
