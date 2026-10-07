"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { capitalize, formatDateLong, formatMonth } from "@/lib/format";
import { DAY_LEVEL_META } from "@/lib/status";
import { addMonths, eachDay, endOfMonth, isoWeekday } from "@/lib/time";
import type { CalendarDay } from "@/server/services/availability";

const WEEKDAY_HEADERS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

export function MonthCalendar({
  month,
  days,
  loading,
  selected,
  today,
  minMonth,
  maxMonth,
  onSelect,
  onMonthChange,
}: {
  /** First day of the month shown, "YYYY-MM-01". */
  month: string;
  days: CalendarDay[] | undefined;
  loading: boolean;
  selected: string | null;
  today: string;
  minMonth: string;
  maxMonth: string;
  onSelect: (date: string) => void;
  onMonthChange: (month: string) => void;
}) {
  const byDate = new Map(days?.map((d) => [d.date, d]));
  const dates = eachDay(month, endOfMonth(month));
  const leading = isoWeekday(month) - 1;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-2xl font-semibold text-ink" aria-live="polite">
          {capitalize(formatMonth(month))}
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(month, -1))}
            disabled={month <= minMonth}
            className="grid size-10 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-30"
            aria-label="Vorige maand"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(month, 1))}
            disabled={month >= maxMonth}
            className="grid size-10 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-30"
            aria-label="Volgende maand"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-busy={loading}>
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} role="columnheader" className="pb-2 text-xs font-semibold tracking-wider text-ink-faint uppercase">
            {d}
          </div>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <div key={`blank-${i}`} aria-hidden />
        ))}
        {dates.map((date) => {
          const info = byDate.get(date);
          const level = info?.level;
          const bookable = level === "available" || level === "limited";
          const isSelected = selected === date;
          const meta = level && level !== "unavailable" ? DAY_LEVEL_META[level] : null;
          return (
            <button
              key={date}
              type="button"
              role="gridcell"
              disabled={!bookable}
              aria-selected={isSelected}
              aria-label={`${formatDateLong(date)}${meta ? `, ${meta.label.toLowerCase()}` : ""}`}
              onClick={() => onSelect(date)}
              className={cn(
                "relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl border text-[15px] font-medium tabular-nums transition-all",
                isSelected
                  ? "border-gold bg-gold text-canvas"
                  : bookable
                    ? "border-line bg-surface-2 text-ink hover:border-gold/60"
                    : "border-transparent text-ink-faint/60",
                level === "full" && !isSelected && "line-through decoration-red-400/50",
                loading && !info && "animate-pulse",
              )}
            >
              <span>{Number(date.slice(8))}</span>
              {meta && level !== "closed" ? (
                <span
                  className={cn("absolute bottom-1.5 size-1.5 rounded-full", isSelected ? "bg-canvas" : meta.dot)}
                  aria-hidden
                />
              ) : null}
              {date === today && !isSelected ? (
                <span className="absolute top-1 right-1.5 text-[8px] font-bold tracking-wider text-gold uppercase">
                  •
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
