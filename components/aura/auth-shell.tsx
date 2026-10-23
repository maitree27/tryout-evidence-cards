import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

/** Frame for pages people see before logging in: small top bar, one calm column. */
export function AuthShell({ title, subtitle, back = "/", children, wide = false }: { title: string; subtitle?: ReactNode; back?: string | null; children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen">
      <header className={`mx-auto flex items-center justify-between px-5 pt-5 ${wide ? "max-w-2xl" : "max-w-sm"}`}>
        {back ? <Link href={back} className="text-sm text-muted hover:text-foreground">← Back</Link> : <span className="text-[17px] font-semibold tracking-tight">Willow</span>}
        <ThemeToggle />
      </header>
      <main className={`mx-auto flex flex-col gap-4 px-5 py-8 ${wide ? "max-w-2xl" : "max-w-sm"}`}>
        <div>
          <h1 className="text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}
