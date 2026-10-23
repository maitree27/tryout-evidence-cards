// Soft glowing colour behind every screen. Purely decorative, hidden from screen readers.
export function Glow() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="glow-orb" style={{ width: 360, height: 360, left: -120, top: 80, background: "var(--glow-1)" }} />
      <div className="glow-orb" style={{ width: 300, height: 300, right: -100, top: 360, background: "var(--glow-2)", animationDelay: "-4s" }} />
      <div className="glow-orb" style={{ width: 280, height: 280, left: "30%", bottom: -120, background: "var(--glow-3)", animationDelay: "-7s" }} />
    </div>
  );
}
