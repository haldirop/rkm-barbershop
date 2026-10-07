import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { AgendaDayView, AgendaLegend, AgendaMonthView, AgendaWeekView } from "@/components/admin/agenda";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { PageHeader } from "@/components/admin/page-header";
import { ButtonLink } from "@/components/ui/button";
import type { Interval } from "@/lib/availability";
import { cn } from "@/lib/cn";
import { capitalize, formatDateLong, formatDateShort, formatMonth } from "@/lib/format";
import type { AppointmentStatus } from "@/lib/status";
import { addDays, addMonths, endOfMonth, isIsoDate, startOfMonth, startOfWeek, zonedNow } from "@/lib/time";
import { requireAdmin } from "@/server/auth/session";
import { listAppointmentsInRange } from "@/server/services/appointments";
import { buildDay, loadSchedule } from "@/server/services/availability";
import { listBusinessHours } from "@/server/services/catalog";

export const metadata = { title: "Agenda" };

type View = "dag" | "week" | "maand";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Visible time range: opening hours of the shown days, widened to include any appointment. */
function visibleRange(hours: Array<Interval | null>, items: Array<{ startTime: string; endTime: string }>): Interval {
  let start = Infinity;
  let end = -Infinity;
  for (const h of hours) {
    if (!h) continue;
    start = Math.min(start, h.start);
    end = Math.max(end, h.end);
  }
  for (const a of items) {
    start = Math.min(start, Number(a.startTime.slice(0, 2)) * 60);
    end = Math.max(end, Number(a.endTime.slice(0, 2)) * 60 + 60);
  }
  if (!Number.isFinite(start)) return { start: 9 * 60, end: 18 * 60 };
  return { start: Math.max(0, Math.floor(start / 60) * 60), end: Math.min(1440, Math.ceil(end / 60) * 60) };
}

export default async function AgendaPage({ searchParams }: PageProps<"/admin/agenda">) {
  await requireAdmin();
  const params = await searchParams;
  const now = zonedNow();
  const viewParam = one(params.weergave);
  const view: View = viewParam === "week" || viewParam === "maand" ? viewParam : "dag";
  const dateParam = one(params.datum);
  const date = dateParam && isIsoDate(dateParam) ? dateParam : now.date;
  const barberFilter = one(params.barber);
  const showAll = one(params.alles) === "1";
  const statuses: AppointmentStatus[] = showAll
    ? ["PENDING", "APPROVED", "COMPLETED", "REJECTED", "CANCELLED"]
    : ["PENDING", "APPROVED", "COMPLETED"];

  const from = view === "dag" ? date : view === "week" ? startOfWeek(date) : startOfWeek(startOfMonth(date));
  const to = view === "dag" ? date : view === "week" ? addDays(from, 6) : addDays(startOfWeek(endOfMonth(date)), 6);

  const [schedule, items, hours] = await Promise.all([
    loadSchedule(from, to),
    listAppointmentsInRange(from, to, { statuses, barberId: barberFilter || undefined }),
    listBusinessHours(),
  ]);
  const barbers = schedule.barbers
    .filter((b) => !barberFilter || b.id === barberFilter)
    .map((b) => ({ id: b.id, name: b.name }));

  const href = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { weergave: view, datum: date, barber: barberFilter, alles: showAll ? "1" : undefined, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    return `/admin/agenda?${next.toString()}`;
  };

  const step = (direction: 1 | -1) =>
    view === "dag" ? addDays(date, direction) : view === "week" ? addDays(date, 7 * direction) : addMonths(date, direction);

  const title =
    view === "dag"
      ? capitalize(formatDateLong(date, true))
      : view === "week"
        ? `${capitalize(formatDateShort(from))} – ${formatDateShort(to)}`
        : capitalize(formatMonth(date));

  const weekDays = view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(from, i)) : [date];
  const range = visibleRange(
    weekDays.map((d) => buildDay(schedule, d).shopHours),
    items,
  );

  return (
    <div>
      <AutoRefresh seconds={90} />
      <PageHeader
        title="Agenda"
        actions={
          <ButtonLink href={`/admin/afspraken/nieuw?datum=${date}`}>
            <Plus className="size-4" aria-hidden /> Nieuwe afspraak
          </ButtonLink>
        }
      />

      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2">
          <Link href={href({ datum: step(-1) })} className="grid size-10 place-items-center rounded-full border border-line hover:border-gold/50" aria-label="Vorige">
            <ChevronLeft className="size-4" />
          </Link>
          <Link href={href({ datum: step(1) })} className="grid size-10 place-items-center rounded-full border border-line hover:border-gold/50" aria-label="Volgende">
            <ChevronRight className="size-4" />
          </Link>
          <Link href={href({ datum: now.date })} className="h-10 rounded-full border border-line px-4 text-sm leading-10 font-medium text-ink-muted hover:text-ink">
            Vandaag
          </Link>
          <h2 className="ml-2 text-lg font-semibold text-ink">{title}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-line p-1" role="group" aria-label="Weergave">
            {(["dag", "week", "maand"] as const).map((v) => (
              <Link
                key={v}
                href={href({ weergave: v })}
                aria-current={view === v ? "true" : undefined}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium capitalize",
                  view === v ? "bg-surface-3 text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {v}
              </Link>
            ))}
          </div>
          <div className="inline-flex flex-wrap rounded-full border border-line p-1" role="group" aria-label="Barber">
            <Link
              href={href({ barber: undefined })}
              className={cn("rounded-full px-3 py-1.5 text-sm", !barberFilter ? "bg-surface-3 text-ink" : "text-ink-muted hover:text-ink")}
            >
              Alle barbers
            </Link>
            {schedule.barbers.map((b) => (
              <Link
                key={b.id}
                href={href({ barber: b.id })}
                className={cn("rounded-full px-3 py-1.5 text-sm", barberFilter === b.id ? "bg-surface-3 text-ink" : "text-ink-muted hover:text-ink")}
              >
                {b.name}
              </Link>
            ))}
          </div>
          <Link href={href({ alles: showAll ? undefined : "1" })} className="text-sm text-ink-muted hover:text-ink">
            {showAll ? "Verberg geannuleerd/afgewezen" : "Toon geannuleerd/afgewezen"}
          </Link>
        </div>
      </div>

      {view === "dag" ? (
        barbers.length ? (
          <AgendaDayView
            date={date}
            range={range}
            day={buildDay(schedule, date)}
            barbers={barbers}
            items={items}
            nowMinute={date === now.date ? now.minutes : null}
          />
        ) : (
          <p className="rounded-2xl border border-line bg-surface p-6 text-ink-muted">Er zijn geen actieve barbers.</p>
        )
      ) : null}

      {view === "week" ? (
        <AgendaWeekView
          days={weekDays.map((d) => ({ date: d, input: buildDay(schedule, d) }))}
          range={range}
          barbers={barbers}
          items={items}
          today={now.date}
          nowMinute={now.minutes}
        />
      ) : null}

      {view === "maand" ? (
        <AgendaMonthView
          month={startOfMonth(date)}
          items={items}
          today={now.date}
          closedWeekdays={hours.filter((h) => !h.isOpen).map((h) => h.weekday)}
        />
      ) : null}

      <div className="mt-4">
        <AgendaLegend />
      </div>
    </div>
  );
}
