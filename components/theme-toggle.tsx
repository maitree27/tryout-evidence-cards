"use client";

import { useEffect, useState } from "react";

const KEY = "willow-theme";

/** Switches between the dark (default) and light look. The choice is remembered in this browser only. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function flip() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch { /* private mode: still works for this visit */ }
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={theme === "dark" ? "Switch to light look" : "Switch to dark look"}
      title={theme === "dark" ? "Switch to light look" : "Switch to dark look"}
      className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-lg hover:opacity-80"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
