import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass p-4", className)} {...props} />;
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "good" | "warn" | "bad" }) {
  const tones = {
    neutral: "bg-card text-foreground border border-border",
    good: "bg-success/20 text-success",
    warn: "bg-warning/20 text-warning",
    bad: "bg-danger/20 text-danger",
  };
  return <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)} {...props} />;
}
