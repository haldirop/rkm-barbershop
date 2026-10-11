import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const percent = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0, signDisplay: "exceptZero" });

/** "+12% vs vorige week"; without a previous figure there is nothing to compare. */
export function Delta({ change, versus }: { change: number | null; versus: string }) {
  if (change === null) return <span className="text-ink-faint">nog geen vergelijking</span>;
  const rounded = Math.round(change);
  if (rounded === 0) return <span className="text-ink-faint">gelijk aan {versus}</span>;
  const up = rounded > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-1", up ? "text-emerald-300" : "text-red-300")}>
      <Icon className="size-3.5" aria-hidden />
      {percent.format(rounded)}% <span className="text-ink-faint">vs {versus}</span>
    </span>
  );
}

export function StatTile({
  label,
  value,
  footer,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  footer?: ReactNode;
  icon?: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border bg-surface p-4 sm:p-5", highlight ? "border-amber-400/40" : "border-line")}>
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        {icon}
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">{value}</p>
      {footer ? <p className="mt-1 text-xs">{footer}</p> : null}
    </div>
  );
}

/** Horizontal bars with the value next to them, e.g. occupancy per weekday. */
export function MeterList({ rows }: { rows: Array<{ key: string; label: string; percent: number; detail?: string }> }) {
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3 text-sm">
          <span className="truncate text-ink-muted">{row.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-chart-1/20" aria-hidden>
            <span className="block h-full rounded-full bg-chart-1" style={{ width: `${Math.min(100, row.percent)}%` }} />
          </span>
          <span className="text-right text-ink tabular-nums">{row.percent}%</span>
        </li>
      ))}
    </ul>
  );
}
