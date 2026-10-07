import { cn } from "@/lib/cn";
import { DAY_LEVEL_META } from "@/lib/status";

export function AvailabilityLegendCompact({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-faint", className)}>
      {(["available", "limited", "full"] as const).map((level) => (
        <li key={level} className="flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", DAY_LEVEL_META[level].dot)} aria-hidden />
          {DAY_LEVEL_META[level].label}
        </li>
      ))}
    </ul>
  );
}
