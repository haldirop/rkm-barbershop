"use client";

import { Sparkles, Sun, Sunrise, Sunset } from "lucide-react";
import { useLocale } from "@/i18n/client";
import { booking, type BookingMessages } from "@/i18n/messages/booking";
import { cn } from "@/lib/cn";
import { timeToMinutes } from "@/lib/time";
import type { DayAvailability } from "@/server/services/availability";

const PARTS = [
  { id: "morning", Icon: Sunrise, test: (m: number) => m < 12 * 60 },
  { id: "afternoon", Icon: Sun, test: (m: number) => m >= 12 * 60 && m < 17 * 60 },
  { id: "evening", Icon: Sunset, test: (m: number) => m >= 17 * 60 },
] as const;

function partLevel(count: number, t: BookingMessages) {
  if (count >= 6) return { dot: "bg-emerald-400", label: t.partLevels.many };
  if (count > 0) return { dot: "bg-amber-400", label: t.partLevels.some };
  return { dot: "bg-red-400", label: t.partLevels.none };
}

export function TimeSlots({
  day,
  loading,
  error,
  selected,
  onSelect,
}: {
  day: DayAvailability | undefined;
  loading: boolean;
  error?: string;
  selected: string | null;
  onSelect: (time: string) => void;
}) {
  const t = booking[useLocale()];
  if (error) return <p className="rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-200">{error}</p>;

  if (loading && !day) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-3" />
        ))}
      </div>
    );
  }

  if (!day || day.slots.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-surface-2 p-5 text-sm text-ink-muted">{t.noSlots}</p>
    );
  }

  return (
    <div className={cn("space-y-6 transition-opacity", loading && "opacity-60")}>
      {day.bestWindow ? (
        <p className="flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/5 px-4 py-3 text-sm text-ink">
          <Sparkles className="size-4 shrink-0 text-gold" aria-hidden />
          <span>
            <span className="font-semibold">{t.bestThisDay}</span> {day.bestWindow.start} –{" "}
            {day.bestWindow.end}
          </span>
        </p>
      ) : null}

      {PARTS.map(({ id, Icon, test }) => {
        const slots = day.slots.filter((s) => test(timeToMinutes(s.time)));
        if (!slots.length) return null;
        const level = partLevel(slots.length, t);
        return (
          <fieldset key={id}>
            <legend className="mb-3 flex w-full items-center gap-2 text-sm font-medium text-ink-muted">
              <Icon className="size-4 text-gold" aria-hidden />
              {t.dayParts[id]}
              <span className="ml-auto flex items-center gap-1.5 text-xs text-ink-faint">
                <span className={cn("size-1.5 rounded-full", level.dot)} aria-hidden />
                {t.times(slots.length)} · {level.label}
              </span>
            </legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => {
                const isSelected = slot.time === selected;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => onSelect(slot.time)}
                    aria-pressed={isSelected}
                    className={cn(
                      "h-12 rounded-xl border text-[15px] font-semibold tabular-nums transition-all active:scale-[0.97]",
                      isSelected
                        ? "border-gold bg-gold text-canvas shadow-[0_8px_24px_-10px_rgba(219,168,92,0.8)]"
                        : "border-line-strong bg-surface-2 text-ink hover:border-gold/60",
                    )}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
