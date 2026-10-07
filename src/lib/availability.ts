/**
 * Availability engine — pure functions, no I/O.
 *
 * Given one day's opening hours, barber schedules, breaks, blocks and existing
 * appointments, it computes which start times can be booked for a service of a
 * given duration. A start time is only offered when the *entire* duration
 * (plus buffer around other appointments) fits.
 *
 * All times are minutes since midnight in shop time.
 */

export interface Interval {
  start: number;
  end: number;
}

export interface DayBarber {
  id: string;
  /** Working hours for this weekday; null = not working. */
  hours: Interval | null;
}

export interface DayInput {
  /** Shop opening hours for this date; null = closed. */
  shopHours: Interval | null;
  barbers: DayBarber[];
  /** Recurring breaks for this weekday. barberId null = whole shop. */
  breaks: Array<Interval & { barberId: string | null }>;
  /** One-off blocks on this date. Full-day blocks are {start: 0, end: 1440}. */
  blocks: Array<Interval & { barberId: string | null }>;
  /** Active (PENDING/APPROVED) appointments on this date. */
  appointments: Array<Interval & { id: string; barberId: string | null }>;
}

export interface SlotRules {
  durationMinutes: number;
  slotIntervalMinutes: number;
  bufferMinutes: number;
  /** Earliest bookable start on this day (e.g. now + lead time). 0 = no restriction. */
  earliestStart: number;
  /** Ignore this appointment (used when rescheduling it). */
  excludeAppointmentId?: string;
}

export interface Slot {
  start: number;
  end: number;
  /** Barbers that can take this slot. */
  barberIds: string[];
}

export type DayLevel = "available" | "limited" | "full" | "closed";

export interface DaySummary {
  level: DayLevel;
  /** Number of distinct bookable start times. */
  availableStarts: number;
  /** Bookable (barber, start) pairs divided by the day's theoretical capacity. */
  ratio: number;
  firstStart: number | null;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Removes `cut` from every interval in `intervals`. */
export function subtractInterval(intervals: Interval[], cut: Interval): Interval[] {
  const result: Interval[] = [];
  for (const iv of intervals) {
    if (!overlaps(iv, cut)) {
      result.push(iv);
      continue;
    }
    if (cut.start > iv.start) result.push({ start: iv.start, end: cut.start });
    if (cut.end < iv.end) result.push({ start: cut.end, end: iv.end });
  }
  return result;
}

function appliesTo(barberId: string) {
  return (item: { barberId: string | null }) => item.barberId === null || item.barberId === barberId;
}

/** Shop hours ∩ barber hours, minus breaks (and optionally blocks). */
export function workingIntervals(day: DayInput, barber: DayBarber, includeBlocks = true): Interval[] {
  if (!day.shopHours || !barber.hours) return [];
  const start = Math.max(day.shopHours.start, barber.hours.start);
  const end = Math.min(day.shopHours.end, barber.hours.end);
  if (end <= start) return [];

  let free: Interval[] = [{ start, end }];
  const cuts = [...day.breaks, ...(includeBlocks ? day.blocks : [])].filter(appliesTo(barber.id));
  for (const cut of cuts) free = subtractInterval(free, cut);
  return free;
}

function gridStarts(interval: Interval, step: number, duration: number): number[] {
  const starts: number[] = [];
  for (let s = Math.ceil(interval.start / step) * step; s + duration <= interval.end; s += step) {
    starts.push(s);
  }
  return starts;
}

/** Bookable start times for one barber. */
export function barberStarts(day: DayInput, barber: DayBarber, rules: SlotRules): number[] {
  const { durationMinutes: duration, slotIntervalMinutes: step, bufferMinutes: buffer } = rules;
  const intervals = workingIntervals(day, barber);
  const booked = day.appointments.filter(
    (a) => a.barberId === barber.id && a.id !== rules.excludeAppointmentId,
  );

  const candidates = new Set<number>();
  for (const iv of intervals) {
    for (const s of gridStarts(iv, step, duration)) candidates.add(s);
    // Also offer the moment a free period starts (after a break or right after an
    // appointment), so the agenda fills up without leaving unusable gaps.
    candidates.add(iv.start);
    for (const a of booked) {
      const afterAppointment = a.end + buffer;
      if (afterAppointment > iv.start && afterAppointment < iv.end) candidates.add(afterAppointment);
    }
  }

  return [...candidates]
    .filter((s) => s >= rules.earliestStart)
    .filter((s) => intervals.some((iv) => s >= iv.start && s + duration <= iv.end))
    .filter((s) =>
      booked.every((a) => s + duration + buffer <= a.start || s >= a.end + buffer),
    )
    .sort((a, b) => a - b);
}

/** Bookable slots, merged over the given barbers. */
export function daySlots(day: DayInput, rules: SlotRules, barberIds?: string[]): Slot[] {
  const barbers = barberIds ? day.barbers.filter((b) => barberIds.includes(b.id)) : day.barbers;
  const byStart = new Map<number, string[]>();
  for (const barber of barbers) {
    for (const start of barberStarts(day, barber, rules)) {
      const list = byStart.get(start) ?? [];
      list.push(barber.id);
      byStart.set(start, list);
    }
  }
  return [...byStart.entries()]
    .sort(([a], [b]) => a - b)
    .map(([start, ids]) => ({ start, end: start + rules.durationMinutes, barberIds: ids }));
}

/**
 * Theoretical number of (barber, start) pairs still ahead on an empty day,
 * ignoring one-off blocks and existing appointments.
 */
function dayCapacity(day: DayInput, rules: SlotRules, barbers: DayBarber[]): number {
  let total = 0;
  for (const barber of barbers) {
    for (const iv of workingIntervals(day, barber, false)) {
      total += gridStarts(iv, rules.slotIntervalMinutes, rules.durationMinutes).filter(
        (s) => s >= rules.earliestStart,
      ).length;
    }
  }
  return total;
}

export function isShopClosed(day: DayInput, barberIds?: string[]): boolean {
  if (!day.shopHours) return true;
  const barbers = barberIds ? day.barbers.filter((b) => barberIds.includes(b.id)) : day.barbers;
  if (!barbers.some((b) => b.hours)) return true;
  // Whole shop blocked for the full opening period (holiday, vacation).
  const { start, end } = day.shopHours;
  return day.blocks.some((b) => b.barberId === null && b.start <= start && b.end >= end);
}

export function summarizeDay(day: DayInput, rules: SlotRules, barberIds?: string[]): DaySummary {
  if (isShopClosed(day, barberIds)) {
    return { level: "closed", availableStarts: 0, ratio: 0, firstStart: null };
  }
  const barbers = barberIds ? day.barbers.filter((b) => barberIds.includes(b.id)) : day.barbers;
  const capacity = dayCapacity(day, rules, barbers);
  // Nothing left of the opening hours (e.g. later today): closed rather than "full".
  if (capacity === 0) return { level: "closed", availableStarts: 0, ratio: 0, firstStart: null };
  const slots = daySlots(day, rules, barberIds);
  const pairs = slots.reduce((sum, s) => sum + s.barberIds.length, 0);
  const ratio = capacity > 0 ? Math.min(1, pairs / capacity) : 0;

  let level: DayLevel = "available";
  if (slots.length === 0) level = "full";
  else if (ratio < 0.35 || slots.length <= 3) level = "limited";

  return { level, availableStarts: slots.length, ratio, firstStart: slots[0]?.start ?? null };
}

/**
 * Contiguous periods in which a booking can start, e.g. starts 11:00, 11:15, 11:30
 * for a 30-minute service become the window 11:00 – 12:00.
 */
export function freeWindows(slots: Slot[], rules: Pick<SlotRules, "slotIntervalMinutes">): Interval[] {
  const windows: Interval[] = [];
  let previousStart = Number.NEGATIVE_INFINITY;
  for (const slot of slots) {
    const last = windows.at(-1);
    const contiguous =
      last && (slot.start <= last.end || slot.start - previousStart <= rules.slotIntervalMinutes);
    if (last && contiguous) last.end = Math.max(last.end, slot.end);
    else windows.push({ start: slot.start, end: slot.end });
    previousStart = slot.start;
  }
  return windows;
}

/** The longest free period of the day ("Rustigste moment"). */
export function bestWindow(slots: Slot[], rules: Pick<SlotRules, "slotIntervalMinutes">): Interval | null {
  let best: Interval | null = null;
  for (const w of freeWindows(slots, rules)) {
    if (!best || w.end - w.start > best.end - best.start) best = w;
  }
  return best;
}

/**
 * Recommended start times for a day: taken from the largest free periods first
 * (those are the least likely to fill up), spaced one service apart, then
 * returned in chronological order.
 */
export function recommendStarts(
  slots: Slot[],
  rules: Pick<SlotRules, "slotIntervalMinutes" | "durationMinutes">,
  max = 3,
): number[] {
  const windows = freeWindows(slots, rules).sort(
    (a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start,
  );
  const picked: number[] = [];
  for (const w of windows) {
    let nextAllowed = w.start;
    for (const slot of slots) {
      if (picked.length >= max) break;
      if (slot.start < nextAllowed || slot.end > w.end) continue;
      picked.push(slot.start);
      nextAllowed = slot.start + rules.durationMinutes;
    }
    if (picked.length >= max) break;
  }
  return picked.sort((a, b) => a - b);
}

/** Picks the barber with the fewest appointments that day (ties: listed order). */
export function pickBarber(day: DayInput, candidateIds: string[]): string | null {
  let best: { id: string; load: number } | null = null;
  for (const id of candidateIds) {
    const load = day.appointments
      .filter((a) => a.barberId === id)
      .reduce((sum, a) => sum + (a.end - a.start), 0);
    if (!best || load < best.load) best = { id, load };
  }
  return best?.id ?? null;
}
