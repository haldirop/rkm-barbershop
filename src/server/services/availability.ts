import "server-only";
import { and, gte, inArray, lte } from "drizzle-orm";
import {
  bestWindow,
  daySlots,
  recommendStarts,
  subtractInterval,
  summarizeDay,
  workingIntervals,
  type DayInput,
  type DayLevel,
  type Interval,
  type SlotRules,
} from "@/lib/availability";
import { ACTIVE_STATUSES } from "@/lib/status";
import {
  addDays,
  eachDay,
  isoWeekday,
  minutesToTime,
  timeToMinutes,
  zonedNow,
  type IsoDate,
  type ZonedNow,
} from "@/lib/time";
import { getDb, type DbOrTx } from "@/server/db/client";
import { appointments, type Settings } from "@/server/db/schema";
import { listBarbers, listBlockedTimes, listBreaks, listBusinessHours } from "./catalog";
import { loadSettings } from "./settings";

/** Everything needed to compute availability for a range of dates. */
export interface Schedule {
  settings: Settings;
  shopHours: Map<number, Interval | null>;
  barbers: Array<{ id: string; name: string; hours: Map<number, Interval | null> }>;
  breaks: Awaited<ReturnType<typeof listBreaks>>;
  blocks: Awaited<ReturnType<typeof listBlockedTimes>>;
  appointments: Array<{ id: string; barberId: string | null; date: string; start: number; end: number }>;
}

export async function loadSchedule(from: IsoDate, to: IsoDate, db: DbOrTx = getDb()): Promise<Schedule> {
  const [settings, hours, barberRows, breakRows, blockRows, appointmentRows] = await Promise.all([
    loadSettings(db),
    listBusinessHours(db),
    listBarbers({ activeOnly: true }, db),
    listBreaks(db),
    listBlockedTimes(from, to, db),
    db
      .select({
        id: appointments.id,
        barberId: appointments.barberId,
        date: appointments.date,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
      })
      .from(appointments)
      .where(
        and(
          gte(appointments.date, from),
          lte(appointments.date, to),
          inArray(appointments.status, [...ACTIVE_STATUSES]),
        ),
      ),
  ]);

  return {
    settings,
    shopHours: new Map(
      hours.map((h) => [
        h.weekday,
        h.isOpen ? { start: timeToMinutes(h.openTime), end: timeToMinutes(h.closeTime) } : null,
      ]),
    ),
    barbers: barberRows.map((b) => ({
      id: b.id,
      name: b.name,
      hours: new Map(
        b.hours.map((h) => [
          h.weekday,
          h.isWorking ? { start: timeToMinutes(h.startTime), end: timeToMinutes(h.endTime) } : null,
        ]),
      ),
    })),
    breaks: breakRows,
    blocks: blockRows,
    appointments: appointmentRows.map((a) => ({
      id: a.id,
      barberId: a.barberId,
      date: a.date,
      start: timeToMinutes(a.startTime),
      end: timeToMinutes(a.endTime),
    })),
  };
}

export function buildDay(schedule: Schedule, date: IsoDate): DayInput {
  const weekday = isoWeekday(date);
  return {
    shopHours: schedule.shopHours.get(weekday) ?? null,
    barbers: schedule.barbers.map((b) => ({ id: b.id, hours: b.hours.get(weekday) ?? null })),
    breaks: schedule.breaks
      .filter((b) => b.weekday === weekday)
      .map((b) => ({
        barberId: b.barberId,
        start: timeToMinutes(b.startTime),
        end: timeToMinutes(b.endTime),
      })),
    blocks: schedule.blocks
      .filter((b) => b.startDate <= date && b.endDate >= date)
      .map((b) => ({
        barberId: b.barberId,
        start: b.startTime ? timeToMinutes(b.startTime) : 0,
        end: b.endTime ? timeToMinutes(b.endTime) : 1440,
      })),
    appointments: schedule.appointments.filter((a) => a.date === date),
  };
}

export interface BookingWindow {
  /** First date on which online booking is possible, and the earliest minute on it. */
  firstDate: IsoDate;
  firstMinute: number;
  lastDate: IsoDate;
}

/** Applies lead time ("minimaal 60 min van tevoren") and booking horizon. */
export function bookingWindow(settings: Settings, now: ZonedNow = zonedNow()): BookingWindow {
  const earliest = now.minutes + settings.minLeadMinutes;
  const dayOffset = Math.floor(earliest / 1440);
  return {
    firstDate: addDays(now.date, dayOffset),
    firstMinute: earliest % 1440,
    lastDate: addDays(now.date, settings.bookingHorizonDays),
  };
}

/** Rules for one date, or null when the date is outside the bookable window. */
export function rulesForDate(
  settings: Settings,
  durationMinutes: number,
  date: IsoDate,
  window: BookingWindow,
  excludeAppointmentId?: string,
): SlotRules | null {
  if (date < window.firstDate || date > window.lastDate) return null;
  return {
    durationMinutes,
    slotIntervalMinutes: settings.slotIntervalMinutes,
    bufferMinutes: settings.bufferMinutes,
    earliestStart: date === window.firstDate ? window.firstMinute : 0,
    excludeAppointmentId,
  };
}

export interface AvailabilityQuery {
  durationMinutes: number;
  /** null = any barber */
  barberId: string | null;
  excludeAppointmentId?: string;
  now?: ZonedNow;
}

function barberFilter(barberId: string | null): string[] | undefined {
  return barberId ? [barberId] : undefined;
}

export interface DayAvailability {
  date: IsoDate;
  level: DayLevel | "unavailable";
  slots: Array<{ time: string; barberIds: string[] }>;
  bestWindow: { start: string; end: string } | null;
}

export async function getDayAvailability(
  date: IsoDate,
  query: AvailabilityQuery,
  db: DbOrTx = getDb(),
): Promise<DayAvailability> {
  const schedule = await loadSchedule(date, date, db);
  return dayAvailabilityFromSchedule(schedule, date, query);
}

export function dayAvailabilityFromSchedule(
  schedule: Schedule,
  date: IsoDate,
  query: AvailabilityQuery,
): DayAvailability {
  const window = bookingWindow(schedule.settings, query.now);
  const rules = rulesForDate(
    schedule.settings,
    query.durationMinutes,
    date,
    window,
    query.excludeAppointmentId,
  );
  if (!rules) return { date, level: "unavailable", slots: [], bestWindow: null };

  const day = buildDay(schedule, date);
  const filter = barberFilter(query.barberId);
  const slots = daySlots(day, rules, filter);
  const summary = summarizeDay(day, rules, filter);
  const best = slots.length > 1 ? bestWindow(slots, rules) : null;
  return {
    date,
    level: summary.level,
    slots: slots.map((s) => ({ time: minutesToTime(s.start), barberIds: s.barberIds })),
    bestWindow: best ? { start: minutesToTime(best.start), end: minutesToTime(best.end) } : null,
  };
}

export interface CalendarDay {
  date: IsoDate;
  level: DayLevel | "unavailable";
  availableStarts: number;
  /** Earliest bookable time, e.g. "10:30". */
  firstTime: string | null;
}

export async function getCalendar(
  from: IsoDate,
  to: IsoDate,
  query: AvailabilityQuery,
  db: DbOrTx = getDb(),
): Promise<CalendarDay[]> {
  const schedule = await loadSchedule(from, to, db);
  const window = bookingWindow(schedule.settings, query.now);
  const filter = barberFilter(query.barberId);
  return eachDay(from, to).map((date) => {
    const rules = rulesForDate(schedule.settings, query.durationMinutes, date, window);
    if (!rules) return { date, level: "unavailable", availableStarts: 0, firstTime: null };
    const summary = summarizeDay(buildDay(schedule, date), rules, filter);
    return {
      date,
      level: summary.level,
      availableStarts: summary.availableStarts,
      firstTime: summary.firstStart === null ? null : minutesToTime(summary.firstStart),
    };
  });
}

export interface Suggestion {
  date: IsoDate;
  times: string[];
}

/** "Beste beschikbaarheid": the next days with room, and the best times on each. */
export async function getSuggestions(
  query: AvailabilityQuery & { maxDays?: number; perDay?: number; searchDays?: number },
  db: DbOrTx = getDb(),
): Promise<Suggestion[]> {
  const now = query.now ?? zonedNow();
  const from = now.date;
  const to = addDays(from, query.searchDays ?? 21);
  const schedule = await loadSchedule(from, to, db);
  const window = bookingWindow(schedule.settings, now);
  const filter = barberFilter(query.barberId);

  const suggestions: Suggestion[] = [];
  for (const date of eachDay(from, to)) {
    const rules = rulesForDate(schedule.settings, query.durationMinutes, date, window);
    if (!rules) continue;
    const slots = daySlots(buildDay(schedule, date), rules, filter);
    const starts = recommendStarts(slots, rules, query.perDay ?? 3);
    if (starts.length) suggestions.push({ date, times: starts.map(minutesToTime) });
    if (suggestions.length >= (query.maxDays ?? 3)) break;
  }
  return suggestions;
}

/** Free hours left today across all active barbers (for the dashboard). */
export async function freeMinutesOnDate(date: IsoDate, db: DbOrTx = getDb()): Promise<number> {
  const schedule = await loadSchedule(date, date, db);
  const day = buildDay(schedule, date);
  const now = zonedNow();
  let total = 0;
  for (const barber of day.barbers) {
    let free = workingIntervals(day, barber);
    for (const a of day.appointments.filter((a) => a.barberId === barber.id)) {
      free = subtractInterval(free, a);
    }
    if (date === now.date) free = subtractInterval(free, { start: 0, end: now.minutes });
    total += free.reduce((sum, iv) => sum + (iv.end - iv.start), 0);
  }
  return total;
}
