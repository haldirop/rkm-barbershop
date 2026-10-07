"use client";

import { Sparkles, Sun, Sunrise, Sunset } from "lucide-react";
import { cn } from "@/lib/cn";
import { timeToMinutes } from "@/lib/time";
import type { DayAvailability } from "@/server/services/availability";

const PARTS = [
  { id: "ochtend", label: "Ochtend", Icon: Sunrise, test: (m: number) => m < 12 * 60 },
  { id: "middag", label: "Middag", Icon: Sun, test: (m: number) => m >= 12 * 60 && m < 17 * 60 },
  { id: "avond", label: "Avond", Icon: Sunset, test: (m: number) => m >= 17 * 60 },
];

function partLevel(count: number) {
  if (count >= 6) return { dot: "bg-emerald-400", label: "ruim" };
  if (count > 0) return { dot: "bg-amber-400", label: "beperkt" };
  return { dot: "bg-red-400", label: "vol" };
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
      <p className="rounded-xl border border-line bg-surface-2 p-5 text-sm text-ink-muted">
        Op deze dag is helaas geen plek meer voor deze behandeling. Kies een andere dag of bekijk de beste
        beschikbaarheid hierboven.
      </p>
    );
  }

  return (
    <div className={cn("space-y-6 transition-opacity", loading && "opacity-60")}>
      {day.bestWindow ? (
        <p className="flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/5 px-4 py-3 text-sm text-ink">
          <Sparkles className="size-4 shrink-0 text-gold" aria-hidden />
          <span>
            <span className="font-semibold">Beste beschikbaarheid deze dag:</span> {day.bestWindow.start} –{" "}
            {day.bestWindow.end}
          </span>
        </p>
      ) : null}

      {PARTS.map(({ id, label, Icon, test }) => {
        const slots = day.slots.filter((s) => test(timeToMinutes(s.time)));
        if (!slots.length) return null;
        const level = partLevel(slots.length);
        return (
          <fieldset key={id}>
            <legend className="mb-3 flex w-full items-center gap-2 text-sm font-medium text-ink-muted">
              <Icon className="size-4 text-gold" aria-hidden />
              {label}
              <span className="ml-auto flex items-center gap-1.5 text-xs text-ink-faint">
                <span className={cn("size-1.5 rounded-full", level.dot)} aria-hidden />
                {slots.length} {slots.length === 1 ? "tijd" : "tijden"} · {level.label}
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
