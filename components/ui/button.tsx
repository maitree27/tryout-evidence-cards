import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  outline: "border border-border bg-card hover:bg-black/5",
  ghost: "hover:bg-black/5",
  danger: "bg-danger text-white hover:opacity-90",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-ui px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
