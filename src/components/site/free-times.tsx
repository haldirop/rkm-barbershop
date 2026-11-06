"use client";

import Link from "next/link";
import { useState } from "react";
import { DayChips } from "@/components/booking/day-chips";
import { useLocale } from "@/i18n/client";
import { localizePath } from "@/i18n/config";
import { booking } from "@/i18n/messages/booking";
import { home } from "@/i18n/messages/home";
import { capitalize, formatDateLong, relativeDayLabel } from "@/lib/format";
import { bookingHref } from "@/lib/links";
import { diffInDays, timeToMinutes } from "@/lib/time";
import type { UpcomingDay } from "@/server/services/availability";

const PARTS = [
  { id: "morning", test: (m: number) => m < 12 * 60 },
  { id: "afternoon", test: (m: number) => m >= 12 * 60 && m < 17 * 60 },
  { id: "evening", test: (m: number) => m >= 17 * 60 },
] as const;

/** "Vrije tijden" on the homepage: pick one of the coming days and see every free time on it. */
export function FreeTimes({ days, today, serviceId }: { days: UpcomingDay[]; today: string; serviceId: string | null }) {
  const locale = useLocale();
  const t = home[locale].hero;
  const b = booking[locale];
  const [selected, setSelected] = useState(() => (days.find((d) => d.times.length) ?? days[0])?.date ?? null);
  const day = days.find((d) => d.date === selected);
  if (!days.length) return <p className="mt-6 text-sm text-ink-muted">{t.bestEmpty}</p>;

  const heading = day
    ? diffInDays(today, day.date) <= 1
      ? `${relativeDayLabel(day.date, today, locale)} · ${formatDateLong(day.date, false, locale)}`
      : capitalize(formatDateLong(day.date, false, locale))
    : "";

  return (
    <div className="mt-6">
      <DayChips days={days} today={today} selected={selected} onSelect={setSelected} allowFull label={b.upcomingTitle} />
      {day ? (
        <div className="mt-6" aria-live="polite">
          <p className="text-sm font-semibold text-ink">{heading}</p>
          {day.times.length ? (
            <div className="mt-3 space-y-4">
              {PARTS.map(({ id, test }) => {
                const times = day.times.filter((time) => test(timeToMinutes(time)));
                if (!times.length) return null;
                return (
                  <div key={id}>
                    <p className="mb-2 text-xs font-medium tracking-wide text-ink-faint uppercase">{b.dayParts[id]}</p>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                      {times.map((time) => (
                        <Link
                          key={time}
                          prefetch={false}
                          href={localizePath(bookingHref({ serviceId: serviceId ?? undefined, date: day.date, time }), locale)}
                          className="flex h-10 items-center justify-center rounded-full border border-line-strong text-sm font-medium text-ink tabular-nums transition-colors hover:border-gold hover:bg-gold/10 hover:text-gold-bright"
                        >
                          {time}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              {t.dayFull}{" "}
              <Link
                prefetch={false}
                href={localizePath(bookingHref({ serviceId: serviceId ?? undefined, date: day.date }), locale)}
                className="font-medium text-gold hover:text-gold-bright"
              >
                {t.dayFullLink}
              </Link>
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
