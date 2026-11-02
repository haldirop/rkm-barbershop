import type { Locale } from "@/i18n/config";
import { common } from "@/i18n/messages/common";
import { cn } from "@/lib/cn";
import { capitalize, weekdayName } from "@/lib/format";
import type { OpeningDay } from "@/lib/opening-hours";

export function OpeningHoursList({
  days,
  todayWeekday,
  locale,
  className,
}: {
  days: OpeningDay[];
  todayWeekday: number;
  locale: Locale;
  className?: string;
}) {
  const t = common[locale];
  return (
    <dl className={cn("divide-y divide-line", className)}>
      {[...days]
        .sort((a, b) => a.weekday - b.weekday)
        .map((day) => {
          const isToday = day.weekday === todayWeekday;
          return (
            <div
              key={day.weekday}
              className={cn("flex items-center justify-between py-2.5 text-[15px]", isToday && "text-gold-bright")}
            >
              <dt className={cn("flex items-center gap-2", !isToday && "text-ink-muted")}>
                {capitalize(weekdayName(day.weekday, locale))}
                {isToday ? (
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-gold uppercase">
                    {t.today}
                  </span>
                ) : null}
              </dt>
              <dd className={cn("tabular-nums", !day.isOpen && "text-ink-faint")}>
                {day.isOpen ? `${day.open} – ${day.close}` : t.closed}
              </dd>
            </div>
          );
        })}
    </dl>
  );
}
