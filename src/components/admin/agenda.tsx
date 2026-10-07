import Link from "next/link";
import { workingIntervals, type DayInput, type Interval } from "@/lib/availability";
import { cn } from "@/lib/cn";
import { capitalize, weekdayShort } from "@/lib/format";
import { STATUS_META, type AppointmentStatus } from "@/lib/status";
import { addDays, eachDay, endOfMonth, isoWeekday, minutesToTime, startOfWeek, timeToMinutes } from "@/lib/time";
import type { AppointmentListItem } from "@/server/services/appointments";

const PX_PER_MINUTE = 1.4;

export interface AgendaBarber {
  id: string;
  name: string;
}

function complement(range: Interval, open: Interval[]): Interval[] {
  const gaps: Interval[] = [];
  let cursor = range.start;
  for (const iv of [...open].sort((a, b) => a.start - b.start)) {
    if (iv.start > cursor) gaps.push({ start: cursor, end: Math.min(iv.start, range.end) });
    cursor = Math.max(cursor, iv.end);
  }
  if (cursor < range.end) gaps.push({ start: cursor, end: range.end });
  return gaps.filter((g) => g.end > g.start);
}

function TimeAxis({ range }: { range: Interval }) {
  const hours: number[] = [];
  for (let m = Math.ceil(range.start / 60) * 60; m < range.end; m += 60) hours.push(m);
  return (
    <div className="relative w-14 shrink-0" style={{ height: (range.end - range.start) * PX_PER_MINUTE }}>
      {hours.map((m) => (
        <span
          key={m}
          className="absolute right-2 -translate-y-1/2 text-xs text-ink-faint tabular-nums"
          style={{ top: (m - range.start) * PX_PER_MINUTE }}
        >
          {minutesToTime(m)}
        </span>
      ))}
    </div>
  );
}

function Lane({
  date,
  barberId,
  range,
  day,
  items,
  compact,
  nowMinute,
}: {
  date: string;
  barberId: string;
  range: Interval;
  day: DayInput;
  items: AppointmentListItem[];
  compact?: boolean;
  nowMinute: number | null;
}) {
  const barber = day.barbers.find((b) => b.id === barberId) ?? { id: barberId, hours: null };
  const closed = complement(range, workingIntervals(day, barber));
  const height = (range.end - range.start) * PX_PER_MINUTE;
  const slots: number[] = [];
  for (let m = range.start; m < range.end; m += 30) slots.push(m);

  return (
    <div className="relative min-w-0 flex-1 border-l border-line" style={{ height }}>
      {/* Hour lines */}
      {slots.map((m) => (
        <div
          key={m}
          className={cn("absolute inset-x-0 border-t", m % 60 === 0 ? "border-line" : "border-line/40")}
          style={{ top: (m - range.start) * PX_PER_MINUTE }}
        />
      ))}
      {/* Closed, breaks, blocks */}
      {closed.map((iv) => (
        <div
          key={iv.start}
          className="hatched absolute inset-x-0"
          style={{ top: (iv.start - range.start) * PX_PER_MINUTE, height: (iv.end - iv.start) * PX_PER_MINUTE }}
          aria-hidden
        />
      ))}
      {/* Click an empty half hour to plan an appointment */}
      {slots.map((m) => (
        <Link
          key={`new-${m}`}
          href={`/admin/afspraken/nieuw?datum=${date}&tijd=${minutesToTime(m)}&barber=${barberId}`}
          className="group absolute inset-x-0 hover:bg-gold/5"
          style={{ top: (m - range.start) * PX_PER_MINUTE, height: 30 * PX_PER_MINUTE }}
          aria-label={`Nieuwe afspraak om ${minutesToTime(m)}`}
          tabIndex={-1}
        >
          <span className="hidden px-1.5 text-[10px] text-gold group-hover:block">+ {minutesToTime(m)}</span>
        </Link>
      ))}
      {items.map((a) => {
        const start = timeToMinutes(a.startTime);
        const end = timeToMinutes(a.endTime);
        const top = (Math.max(start, range.start) - range.start) * PX_PER_MINUTE;
        const h = Math.max(18, (Math.min(end, range.end) - Math.max(start, range.start)) * PX_PER_MINUTE - 2);
        return (
          <Link
            key={a.id}
            href={`/admin/afspraken/${a.id}`}
            className={cn(
              "absolute inset-x-1 z-10 overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-xs leading-tight transition-transform hover:z-20 hover:scale-[1.02]",
              STATUS_META[a.status].block,
            )}
            style={{ top: top + 1, height: h }}
            title={`${a.startTime.slice(0, 5)}–${a.endTime.slice(0, 5)} ${a.firstName} ${a.lastName} · ${a.serviceName} (${STATUS_META[a.status].label})`}
          >
            <span className="block truncate font-semibold">
              {compact ? a.startTime.slice(0, 5) : `${a.startTime.slice(0, 5)} ${a.firstName} ${a.lastName}`}
            </span>
            {!compact && h > 30 ? <span className="block truncate opacity-80">{a.serviceName}</span> : null}
          </Link>
        );
      })}
      {nowMinute !== null && nowMinute > range.start && nowMinute < range.end ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-30 border-t-2 border-red-400"
          style={{ top: (nowMinute - range.start) * PX_PER_MINUTE }}
          aria-hidden
        >
          <span className="absolute -top-1.5 -left-1.5 size-3 rounded-full bg-red-400" />
        </div>
      ) : null}
    </div>
  );
}

export function AgendaDayView({
  date,
  range,
  day,
  barbers,
  items,
  nowMinute,
}: {
  date: string;
  range: Interval;
  day: DayInput;
  barbers: AgendaBarber[];
  items: AppointmentListItem[];
  nowMinute: number | null;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <div className="min-w-[36rem]">
        <div className="sticky top-0 z-20 flex border-b border-line bg-surface">
          <div className="w-14 shrink-0" />
          {barbers.map((b) => (
            <div key={b.id} className="flex-1 border-l border-line px-3 py-3 text-sm font-semibold text-ink">
              {b.name}
              <span className="ml-2 font-normal text-ink-faint">
                {items.filter((a) => a.barberId === b.id).length}
              </span>
            </div>
          ))}
        </div>
        <div className="flex py-3 pr-2">
          <TimeAxis range={range} />
          {barbers.map((b) => (
            <Lane
              key={b.id}
              date={date}
              barberId={b.id}
              range={range}
              day={day}
              items={items.filter((a) => a.barberId === b.id)}
              nowMinute={nowMinute}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AgendaWeekView({
  days,
  range,
  barbers,
  items,
  today,
  nowMinute,
}: {
  days: Array<{ date: string; input: DayInput }>;
  range: Interval;
  barbers: AgendaBarber[];
  items: AppointmentListItem[];
  today: string;
  nowMinute: number;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <div className="min-w-[56rem]">
        <div className="sticky top-0 z-20 flex border-b border-line bg-surface">
          <div className="w-14 shrink-0" />
          {days.map(({ date }) => (
            <Link
              key={date}
              href={`/admin/agenda?weergave=dag&datum=${date}`}
              className={cn(
                "flex-1 border-l border-line px-2 py-3 text-center text-sm hover:bg-surface-2",
                date === today ? "text-gold-bright" : "text-ink",
              )}
            >
              <span className="block text-xs text-ink-faint uppercase">{weekdayShort(isoWeekday(date))}</span>
              <span className="font-semibold tabular-nums">{Number(date.slice(8))}</span>
            </Link>
          ))}
        </div>
        <div className="flex py-3 pr-2">
          <TimeAxis range={range} />
          {days.map(({ date, input }) => (
            <div key={date} className="flex flex-1 border-l border-line">
              {barbers.map((b) => (
                <Lane
                  key={b.id}
                  date={date}
                  barberId={b.id}
                  range={range}
                  day={input}
                  items={items.filter((a) => a.date === date && a.barberId === b.id)}
                  compact
                  nowMinute={date === today ? nowMinute : null}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AgendaMonthView({
  month,
  items,
  today,
  closedWeekdays,
}: {
  month: string;
  items: AppointmentListItem[];
  today: string;
  closedWeekdays: number[];
}) {
  // Full weeks, Monday to Sunday, covering the whole month.
  const days = eachDay(startOfWeek(month), addDays(startOfWeek(endOfMonth(month)), 6));

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="grid grid-cols-7 border-b border-line">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold tracking-wider text-ink-faint uppercase">
            {weekdayShort(d)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date) => {
          const inMonth = date.slice(0, 7) === month.slice(0, 7);
          const dayItems = items.filter((a) => a.date === date);
          const counts = dayItems.reduce<Partial<Record<AppointmentStatus, number>>>((acc, a) => {
            acc[a.status] = (acc[a.status] ?? 0) + 1;
            return acc;
          }, {});
          const closed = closedWeekdays.includes(isoWeekday(date));
          return (
            <Link
              key={date}
              href={`/admin/agenda?weergave=dag&datum=${date}`}
              className={cn(
                "min-h-24 border-r border-b border-line p-2 transition-colors hover:bg-surface-2 sm:min-h-28",
                !inMonth && "opacity-40",
                closed && "hatched",
              )}
            >
              <span
                className={cn(
                  "inline-grid size-7 place-items-center rounded-full text-sm tabular-nums",
                  date === today ? "bg-gold font-semibold text-canvas" : "text-ink",
                )}
              >
                {Number(date.slice(8))}
              </span>
              <div className="mt-1 space-y-1">
                {(["PENDING", "APPROVED", "COMPLETED"] as const).map((status) =>
                  counts[status] ? (
                    <span key={status} className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                      <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_META[status].dot)} aria-hidden />
                      <span className="truncate">
                        {counts[status]} <span className="hidden sm:inline">{STATUS_META[status].label.toLowerCase()}</span>
                      </span>
                    </span>
                  ) : null,
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AgendaLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-muted">
      {(["PENDING", "APPROVED", "COMPLETED", "REJECTED", "CANCELLED"] as const).map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", STATUS_META[s].dot)} aria-hidden />
          {capitalize(STATUS_META[s].label)}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="hatched size-3 rounded-sm border border-line" aria-hidden /> Gesloten / pauze / geblokkeerd
      </li>
    </ul>
  );
}
