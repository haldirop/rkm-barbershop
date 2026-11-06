"use client";

import { useLocale } from "@/i18n/client";
import { common } from "@/i18n/messages/common";
import { cn } from "@/lib/cn";
import { formatDateLong, weekdayShort } from "@/lib/format";
import { DAY_LEVEL_META } from "@/lib/status";
import { isoWeekday } from "@/lib/time";

export interface ChipDay {
  date: string;
  level: "available" | "limited" | "full" | "closed";
}

/**
 * The coming days in a row ("vr 7 · za 8 · ma 10 …"): tap one to see all of its times.
 * A coloured dot shows how busy it is; fully booked days can only be picked with `allowFull`.
 */
export function DayChips({
  days,
  today,
  selected,
  onSelect,
  allowFull = false,
  label,
  className,
}: {
  days: ChipDay[];
  today: string;
  selected: string | null;
  onSelect: (date: string) => void;
  allowFull?: boolean;
  label: string;
  className?: string;
}) {
  const locale = useLocale();
  const levels = common[locale].dayLevels;
  return (
    <ul role="list" aria-label={label} className={cn("grid grid-cols-7 gap-1.5 sm:gap-2", className)}>
      {days.map((day) => {
        const active = day.date === selected;
        const full = day.level === "full" || day.level === "closed";
        const disabled = full && !allowFull;
        return (
          <li key={day.date}>
            <button
              type="button"
              onClick={() => onSelect(day.date)}
              disabled={disabled}
              aria-pressed={active}
              aria-label={`${day.date === today ? `${common[locale].today}, ` : ""}${formatDateLong(day.date, false, locale)}: ${levels[day.level].label}`}
              className={cn(
                "flex w-full flex-col items-center rounded-xl border px-1 py-2 transition-all active:scale-[0.97] sm:py-2.5",
                active
                  ? "border-gold bg-gold text-canvas shadow-[0_8px_24px_-12px_rgba(219,168,92,0.9)]"
                  : "border-line-strong bg-surface-2 text-ink hover:border-gold/60",
                disabled && "cursor-not-allowed opacity-45 hover:border-line-strong",
              )}
            >
              <span className={cn("text-[11px] font-semibold tracking-wide uppercase", active ? "text-canvas/80" : "text-ink-faint")}>
                {weekdayShort(isoWeekday(day.date), locale)}
              </span>
              <span className="mt-0.5 text-lg leading-none font-semibold tabular-nums sm:text-xl">{Number(day.date.slice(8))}</span>
              <span
                className={cn("mt-1.5 size-1.5 rounded-full", active ? "bg-canvas/70" : DAY_LEVEL_META[day.level].dot)}
                aria-hidden
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
