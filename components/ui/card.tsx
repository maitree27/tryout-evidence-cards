import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-ui border-2 border-border bg-card p-4", className)} {...props} />;
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "good" | "warn" | "bad" }) {
  const tones = {
    neutral: "bg-foreground text-background",
    good: "bg-primary text-primary-foreground",
    warn: "bg-accent text-foreground",
    bad: "bg-danger text-white",
  };
  return (
    <span className={cn("inline-block px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider", tones[tone], className)} {...props} />
  );
}
