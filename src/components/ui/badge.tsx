import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const toneClasses = {
  neutral: "bg-slate-900/5 text-slate-700 ring-slate-200",
  accent: "bg-emerald-600/10 text-emerald-800 ring-emerald-600/20",
  warm: "bg-orange-500/10 text-orange-800 ring-orange-500/20",
  danger: "bg-rose-600/10 text-rose-800 ring-rose-600/20",
  info: "bg-sky-600/10 text-sky-800 ring-sky-600/20",
} as const;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof toneClasses;
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
