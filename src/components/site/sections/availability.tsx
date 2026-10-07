import { ArrowRight, Lightbulb } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatDateLong, relativeDayLabel, weekdayShort } from "@/lib/format";
import { bookingHref } from "@/lib/links";
import { DAY_LEVEL_META } from "@/lib/status";
import { isoWeekday } from "@/lib/time";
import type { CalendarDay } from "@/server/services/availability";

export function AvailabilityLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-muted", className)}>
      {(["available", "limited", "full", "closed"] as const).map((level) => (
        <li key={level} className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", DAY_LEVEL_META[level].dot)} aria-hidden />
          {DAY_LEVEL_META[level].label}
        </li>
      ))}
    </ul>
  );
}

export function AvailabilityOverview({
  days,
  today,
  service,
}: {
  days: CalendarDay[];
  today: string;
  service: { id: string; name: string } | null;
}) {
  const bookable = days.filter((d) => d.level === "available" || d.level === "limited");
  const quietest = bookable.slice(0, 7).reduce<CalendarDay | null>(
    (best, d) => (!best || d.availableStarts > best.availableStarts ? d : best),
    null,
  );

  return (
    <section aria-labelledby="beschikbaarheid" className="py-24 sm:py-32">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <Reveal>
            <SectionHeading
              id="beschikbaarheid"
              eyebrow="Beschikbaarheid"
              title="Wanneer kun je terecht?"
              intro={`Live uit onze agenda${service ? ` voor ${service.name.toLowerCase()}` : ""}. Kies een dag om direct de vrije tijden te zien.`}
            />
          </Reveal>
          <AvailabilityLegend className="lg:justify-end" />
        </div>

        <Reveal className="mt-12">
          <ol className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0">
            {days.map((day) => {
              const meta = day.level === "unavailable" ? DAY_LEVEL_META.closed : DAY_LEVEL_META[day.level];
              const clickable = day.level === "available" || day.level === "limited";
              const content = (
                <>
                  <span className="text-xs font-semibold tracking-wider text-ink-faint uppercase">
                    {day.date === today ? "Vandaag" : weekdayShort(isoWeekday(day.date))}
                  </span>
                  <span className="mt-1 font-display text-3xl font-semibold text-ink tabular-nums">
                    {Number(day.date.slice(8))}
                  </span>
                  <span className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                    <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
                    {clickable && day.firstTime ? `vanaf ${day.firstTime}` : meta.short}
                  </span>
                </>
              );
              const base =
                "flex min-w-[5.5rem] snap-start flex-col items-center rounded-2xl border px-3 py-4 text-center transition-all";
              return (
                <li key={day.date}>
                  {clickable ? (
                    <Link
                      href={bookingHref({ serviceId: service?.id, date: day.date })}
                      aria-label={`${formatDateLong(day.date)}: ${meta.label}`}
                      className={cn(base, "border-line bg-surface hover:-translate-y-0.5 hover:border-gold/50")}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      aria-label={`${formatDateLong(day.date)}: ${meta.label}`}
                      className={cn(base, "border-line/60 bg-surface/40 opacity-60")}
                    >
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </Reveal>

        <div className="mt-10 flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-3 text-ink-muted">
            <Lightbulb className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
            {quietest ? (
              <span>
                <span className="font-semibold text-ink">Tip:</span> de meeste ruimte is er{" "}
                <span className="text-ink">{relativeDayLabel(quietest.date, today).toLowerCase()}</span>
                {quietest.date !== today && quietest.date > today ? ` (${formatDateLong(quietest.date)})` : ""}.
              </span>
            ) : (
              <span>De komende dagen is het druk. Bel ons gerust, dan zoeken we samen een moment.</span>
            )}
          </p>
          <ButtonLink href={bookingHref({ serviceId: service?.id })} variant="secondary">
            Alle tijden bekijken
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
