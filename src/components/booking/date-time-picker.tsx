"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AvailabilityAlert } from "./availability-alert";
import { AvailabilityLegendCompact } from "./legend";
import { DayChips, type ChipDay } from "./day-chips";
import { useJson } from "./hooks";
import { MonthCalendar } from "./month-calendar";
import { TimeSlots } from "./time-slots";
import { useLocale } from "@/i18n/client";
import { booking } from "@/i18n/messages/booking";
import { capitalize, formatDateLong } from "@/lib/format";
import { addDays, endOfMonth, startOfMonth } from "@/lib/time";
import type { CalendarDay, DayAvailability } from "@/server/services/availability";

export interface DateTimeValue {
  date: string | null;
  time: string | null;
}

/**
 * The coming days in a row + calendar + all time slots of the chosen day, driven by the public
 * availability API.
 * `query` is the base query string, e.g. "behandeling=…&barber=…" or "afspraak=<token>".
 */
export function DateTimePicker({
  query,
  today,
  lastDate,
  value,
  onChange,
  refreshKey = 0,
  waitlist,
}: {
  query: string;
  today: string;
  lastDate: string;
  value: DateTimeValue;
  onChange: (value: DateTimeValue) => void;
  refreshKey?: number;
  /** When set, fully booked days can be picked to sign up for a "plek vrij" e-mail. */
  waitlist?: { serviceId: string; barberId: string | null };
}) {
  const locale = useLocale();
  const t = booking[locale];
  const [month, setMonth] = useState(startOfMonth(value.date ?? today));
  const slotsRef = useRef<HTMLDivElement>(null);
  // The language only changes the wording of error messages.
  const v = `&v=${refreshKey}&taal=${locale}`;

  const calendar = useJson<CalendarDay[]>(
    `/api/availability/calendar?${query}&van=${month}&tot=${endOfMonth(month)}${v}`,
  );
  const day = useJson<DayAvailability>(value.date ? `/api/availability/day?${query}&datum=${value.date}${v}` : null);
  // The next open days (a month ahead is plenty to find seven).
  const upcoming = useJson<CalendarDay[]>(`/api/availability/calendar?${query}&van=${today}&tot=${addDays(today, 31)}${v}`);
  const coming: ChipDay[] = (upcoming.data ?? [])
    .filter((d) => d.level !== "unavailable" && d.level !== "closed" && !(d.date === today && d.availableStarts === 0))
    .slice(0, 7)
    .map((d) => ({ date: d.date, level: d.level as ChipDay["level"] }));

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

  return (
    <div className="space-y-6">
      <section aria-labelledby="upcoming-days" className="rounded-2xl border border-gold/20 bg-gradient-to-b from-gold/[0.07] to-transparent p-4 sm:p-5">
        <h3 id="upcoming-days" className="flex items-center gap-2 text-sm font-semibold text-gold">
          <CalendarDays className="size-4" aria-hidden />
          {t.upcomingTitle}
        </h3>
        <p className="mt-1 text-xs text-ink-faint">{t.upcomingHint}</p>
        {upcoming.loading && !upcoming.data ? (
          <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2" aria-busy>
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="h-[4.25rem] animate-pulse rounded-xl bg-surface-3" />
            ))}
          </div>
        ) : (
          <DayChips
            className="mt-4"
            days={coming}
            today={today}
            selected={value.date}
            onSelect={(date) => {
              setMonth(startOfMonth(date));
              selectDate(date);
            }}
            allowFull={Boolean(waitlist)}
            label={t.upcomingTitle}
          />
        )}
      </section>

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
            allowFull={Boolean(waitlist)}
          />
          <AvailabilityLegendCompact className="mt-4" />
          {calendar.error ? <p className="mt-3 text-sm text-red-300">{calendar.error}</p> : null}
        </div>

        <div ref={slotsRef} className="scroll-mt-24">
          <h3 className="mb-4 font-display text-2xl font-semibold text-ink">
            {value.date ? capitalize(formatDateLong(value.date, false, locale)) : t.pickDay}
          </h3>
          {value.date && waitlist && day.data?.date === value.date && day.data.level === "full" ? (
            <AvailabilityAlert
              key={`${value.date}|${waitlist.serviceId}|${waitlist.barberId}`}
              date={value.date}
              serviceId={waitlist.serviceId}
              barberId={waitlist.barberId}
            />
          ) : value.date ? (
            <TimeSlots
              day={day.data?.date === value.date ? day.data : undefined}
              loading={day.loading}
              error={day.error}
              selected={value.time}
              onSelect={(time) => onChange({ date: value.date, time })}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-line-strong p-5 text-sm text-ink-muted">{t.pickDayHint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
