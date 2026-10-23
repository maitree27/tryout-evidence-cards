"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Icon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...stroke}>{children}</svg>
);
const icons = {
  home: <Icon><path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /></Icon>,
  chart: <Icon><path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6" /></Icon>,
  clips: <Icon><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9.5l5 2.5-5 2.5z" /></Icon>,
  user: <Icon><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-5.5 8-5.5s6.5 1.5 8 5.5" /></Icon>,
  students: <Icon><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5M16 5a3.5 3.5 0 0 1 0 7M18 15c2 .5 3.2 2 3.7 5" /></Icon>,
  review: <Icon><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></Icon>,
  more: <Icon><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></Icon>,
};

type Item = { href: string; label: string; icon: keyof typeof icons; match: (p: string) => boolean };

const coach: { left: Item[]; add: { href: string; label: string }; right: Item[] } = {
  left: [
    { href: "/dashboard", label: "Home", icon: "home", match: (p) => p === "/dashboard" },
    { href: "/students", label: "Students", icon: "students", match: (p) => p.startsWith("/students") || p.startsWith("/athletes/") && !p.startsWith("/athletes/new") },
  ],
  add: { href: "/athletes/new", label: "Add student" },
  right: [
    { href: "/review", label: "Review", icon: "review", match: (p) => p.startsWith("/review") || p.startsWith("/videos") },
    { href: "/settings", label: "More", icon: "more", match: (p) => p.startsWith("/settings") },
  ],
};

const student: typeof coach = {
  left: [
    { href: "/me", label: "Home", icon: "home", match: (p) => p === "/me" },
    { href: "/me/progress", label: "Progress", icon: "chart", match: (p) => p.startsWith("/me/progress") },
  ],
  add: { href: "/me/upload", label: "Upload a clip" },
  right: [
    { href: "/me/clips", label: "Clips", icon: "clips", match: (p) => p.startsWith("/me/clips") || p.startsWith("/me/videos") },
    { href: "/me/profile", label: "Profile", icon: "user", match: (p) => p.startsWith("/me/profile") },
  ],
};

/** App-style bottom navigation: two tabs, a big + in the middle, two more tabs. */
export function TabBar({ role }: { role: "coach" | "student" }) {
  const path = usePathname() ?? "";
  const cfg = role === "coach" ? coach : student;
  const tab = (it: Item) => {
    const active = it.match(path);
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition active:scale-95 ${active ? "text-foreground" : "text-muted"}`}
      >
        <span className={active ? "rounded-full bg-foreground/10 px-4 py-1" : "px-4 py-1"}>{icons[it.icon]}</span>
        {it.label}
      </Link>
    );
  };
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 px-4 pb-4">
      <div className="mx-auto flex max-w-xl items-center rounded-full border border-border bg-card px-2 py-1 backdrop-blur-xl">
        {cfg.left.map(tab)}
        <Link
          href={cfg.add.href}
          aria-label={cfg.add.label}
          className="mx-1 -mt-8 grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-3xl text-primary-foreground shadow-lg transition active:scale-95"
        >
          <span aria-hidden="true" className="-mt-0.5">+</span>
        </Link>
        {cfg.right.map(tab)}
      </div>
    </nav>
  );
}
