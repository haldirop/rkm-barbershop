/**
 * Insight calculations for the owner — pure functions, no I/O.
 * A "visit" is an appointment that took place (completed, or confirmed and in the past).
 */
import { diffInDays, startOfMonth, type IsoDate } from "./time";

/** +12.5 for 112.5 vs 100; null when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface Visit {
  customerId: string;
  date: IsoDate;
}

/** Per month: customers who came for the first time ever, and customers who came back. */
export function newVsReturning(visits: Visit[], months: IsoDate[]) {
  const firstVisit = new Map<string, IsoDate>();
  for (const v of visits) {
    const first = firstVisit.get(v.customerId);
    if (!first || v.date < first) firstVisit.set(v.customerId, v.date);
  }
  return months.map((month) => {
    const seen = new Set<string>();
    let newCustomers = 0;
    let returning = 0;
    for (const v of visits) {
      if (startOfMonth(v.date) !== month || seen.has(v.customerId)) continue;
      seen.add(v.customerId);
      if (startOfMonth(firstVisit.get(v.customerId)!) === month) newCustomers++;
      else returning++;
    }
    return { month, newCustomers, returning };
  });
}

export interface CustomerRhythm {
  customerId: string;
  visits: number;
  lastVisit: IsoDate;
  /** Average days between visits; null with a single visit. */
  averageGapDays: number | null;
}

/** How often each customer comes, from their visits. */
export function visitRhythms(visits: Visit[]): CustomerRhythm[] {
  const byCustomer = new Map<string, IsoDate[]>();
  for (const v of visits) byCustomer.set(v.customerId, [...(byCustomer.get(v.customerId) ?? []), v.date]);
  return [...byCustomer].map(([customerId, dates]) => {
    // Two appointments on one day count as one visit.
    const days = [...new Set(dates)].sort();
    const first = days[0];
    const last = days[days.length - 1];
    return {
      customerId,
      visits: days.length,
      lastVisit: last,
      averageGapDays: days.length > 1 ? diffInDays(first, last) / (days.length - 1) : null,
    };
  });
}

export interface DueCustomer extends CustomerRhythm {
  averageGapDays: number;
  daysSince: number;
  /** Days later than usual. */
  overdueDays: number;
}

/**
 * Regular customers (2+ visits) who are clearly later than usual — at least 1.5× their
 * own rhythm and at least `minDays` — and have nothing planned yet. Most overdue first.
 */
export function dueForVisit(
  rhythms: CustomerRhythm[],
  today: IsoDate,
  opts: { planned: Set<string>; minDays?: number; factor?: number },
): DueCustomer[] {
  const minDays = opts.minDays ?? 35;
  const factor = opts.factor ?? 1.5;
  const due: DueCustomer[] = [];
  for (const r of rhythms) {
    if (r.averageGapDays === null || opts.planned.has(r.customerId)) continue;
    const daysSince = diffInDays(r.lastVisit, today);
    if (daysSince < minDays || daysSince < r.averageGapDays * factor) continue;
    due.push({ ...r, averageGapDays: r.averageGapDays, daysSince, overdueDays: Math.round(daysSince - r.averageGapDays) });
  }
  return due.sort((a, b) => b.overdueDays - a.overdueDays);
}

/** Counts per weekday (1–7) and hour (0–23). */
export function heatmapCounts(points: Array<{ weekday: number; hour: number }>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of points) {
    const key = `${p.weekday}-${p.hour}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** ISO week number (week 1 contains the first Thursday of the year). */
export function isoWeekNumber(date: IsoDate): number {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

/** "elke 4 weken" / "elke 10 dagen". */
export function rhythmLabel(days: number): string {
  return days < 14 ? `elke ${Math.round(days)} dagen` : `elke ${Math.round(days / 7)} weken`;
}
