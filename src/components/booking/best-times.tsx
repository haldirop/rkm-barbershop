"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { relativeDayLabel } from "@/lib/format";
import type { Suggestion } from "@/server/services/availability";

/** "Beste beschikbaarheid": quick picks based on the current agenda. */
export function BestTimes({
  suggestions,
  loading,
  today,
  selected,
  onPick,
}: {
  suggestions: Suggestion[] | undefined;
  loading: boolean;
  today: string;
  selected: { date: string | null; time: string | null };
  onPick: (date: string, time: string) => void;
}) {
  if (!loading && !suggestions?.length) return null;
  return (
    <section aria-labelledby="best-times" className="rounded-2xl border border-gold/20 bg-gradient-to-b from-gold/[0.07] to-transparent p-5">
      <h3 id="best-times" className="flex items-center gap-2 text-sm font-semibold text-gold">
        <Sparkles className="size-4" aria-hidden />
        Beste beschikbaarheid
      </h3>
      <p className="mt-1 text-xs text-ink-faint">
        Op basis van de huidige agenda zijn deze tijden het meest waarschijnlijk beschikbaar.
      </p>
      {loading && !suggestions ? (
        <div className="mt-4 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-surface-3" />
          ))}
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {suggestions?.map((s) => (
            <li key={s.date} className="flex flex-wrap items-center gap-2">
              <span className="w-full text-sm font-medium text-ink sm:w-28">{relativeDayLabel(s.date, today)}</span>
              {s.times.map((time) => {
                const active = selected.date === s.date && selected.time === time;
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => onPick(s.date, time)}
                    aria-pressed={active}
                    className={cn(
                      "h-10 rounded-full border px-4 text-sm font-semibold tabular-nums transition-all",
                      active
                        ? "border-gold bg-gold text-canvas"
                        : "border-line-strong text-ink hover:border-gold hover:text-gold-bright",
                    )}
                  >
                    {time}
                  </button>
                );
              })}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
