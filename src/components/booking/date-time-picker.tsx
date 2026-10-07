"use client";

import { useEffect, useRef, useState } from "react";
import { AvailabilityLegendCompact } from "./legend";
import { BestTimes } from "./best-times";
import { useJson } from "./hooks";
import { MonthCalendar } from "./month-calendar";
import { TimeSlots } from "./time-slots";
import { capitalize, formatDateLong } from "@/lib/format";
import { endOfMonth, startOfMonth } from "@/lib/time";
import type { CalendarDay, DayAvailability, Suggestion } from "@/server/services/availability";

export interface DateTimeValue {
  date: string | null;
  time: string | null;
}

/**
 * Calendar + time slots + "beste beschikbaarheid", driven by the public availability API.
 * `query` is the base query string, e.g. "behandeling=…&barber=…" or "afspraak=<token>".
 */
export function DateTimePicker({
  query,
  today,
  lastDate,
  value,
  onChange,
  refreshKey = 0,
}: {
  query: string;
  today: string;
  lastDate: string;
  value: DateTimeValue;
  onChange: (value: DateTimeValue) => void;
  refreshKey?: number;
}) {
  const [month, setMonth] = useState(startOfMonth(value.date ?? today));
  const slotsRef = useRef<HTMLDivElement>(null);
  const v = `&v=${refreshKey}`;

  const calendar = useJson<CalendarDay[]>(
    `/api/availability/calendar?${query}&van=${month}&tot=${endOfMonth(month)}${v}`,
  );
  const day = useJson<DayAvailability>(value.date ? `/api/availability/day?${query}&datum=${value.date}${v}` : null);
  const suggestions = useJson<Suggestion[]>(`/api/availability/suggestions?${query}${v}`);

  // A pre-selected time (from a link or an earlier step) that is no longer free is cleared.
  useEffect(() => {
    if (day.data && value.time && !day.data.slots.some((s) => s.time === value.time)) {
      onChange({ date: value.date, time: null });
    }
  }, [day.data, value.date, value.time, onChange]);

  function selectDate(date: string) {
    onChange({ date, time: null });
    // On phones the time slots are below the calendar: bring them into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  function pickSuggestion(date: string, time: string) {
    setMonth(startOfMonth(date));
    onChange({ date, time });
  }

  return (
    <div className="space-y-6">
      <BestTimes
        suggestions={suggestions.data}
        loading={suggestions.loading}
        today={today}
        selected={value}
        onPick={pickSuggestion}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
        <div>
          <MonthCalendar
            month={month}
            days={calendar.data}
            loading={calendar.loading}
            selected={value.date}
            today={today}
            minMonth={startOfMonth(today)}
            maxMonth={startOfMonth(lastDate)}
            onSelect={selectDate}
            onMonthChange={setMonth}
          />
          <AvailabilityLegendCompact className="mt-4" />
          {calendar.error ? <p className="mt-3 text-sm text-red-300">{calendar.error}</p> : null}
        </div>

        <div ref={slotsRef} className="scroll-mt-24">
          <h3 className="mb-4 font-display text-2xl font-semibold text-ink">
            {value.date ? capitalize(formatDateLong(value.date)) : "Kies een dag"}
          </h3>
          {value.date ? (
            <TimeSlots
              day={day.data?.date === value.date ? day.data : undefined}
              loading={day.loading}
              error={day.error}
              selected={value.time}
              onSelect={(time) => onChange({ date: value.date, time })}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-line-strong p-5 text-sm text-ink-muted">
              Kies links een dag in de kalender, of tik op een van de voorgestelde tijden hierboven.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
