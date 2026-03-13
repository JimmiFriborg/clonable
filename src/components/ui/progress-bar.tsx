import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-2 overflow-hidden rounded-full bg-slate-900/10",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e_0%,#14b8a6_55%,#f97316_100%)] transition-all"
        style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
      />
    </div>
  );
}
