import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { TabBar } from "@/components/aura/tab-bar";

/** App frame: quiet top bar (name + light/dark switch) and the bottom tab bar. Content goes in between. */
export function AppShell({ role, homeHref, children }: { role: "coach" | "student"; homeHref: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-32">
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 pt-5">
        <Link href={homeHref} className="text-[17px] font-semibold tracking-tight">Willow</Link>
        <ThemeToggle />
      </header>
      {children}
      <TabBar role={role} />
    </div>
  );
}
