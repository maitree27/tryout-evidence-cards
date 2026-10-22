import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-ui border border-border bg-card p-4", className)} {...props} />;
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "good" | "warn" | "bad" }) {
  const tones = {
    neutral: "bg-black/5 text-foreground",
    good: "bg-green-100 text-green-800",
    warn: "bg-amber-100 text-amber-800",
    bad: "bg-red-100 text-red-800",
  };
  return (
    <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)} {...props} />
  );
}
