/**
 * Date/time helpers. Dates are "YYYY-MM-DD" strings and times are minutes since
 * midnight, both in the shop's local time zone. Pure functions, safe on client and server.
 */

export const SHOP_TIME_ZONE = "Europe/Amsterdam";

export type IsoDate = string;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isTimeString(value: string): boolean {
  return TIME_RE.test(value);
}

/** "09:30" or "09:30:00" → 570 */
export function timeToMinutes(value: string): number {
  const match = TIME_RE.exec(value);
  if (!match) throw new Error(`Ongeldige tijd: ${value}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 570 → "09:30" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toUtcDate(date: IsoDate): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = toUtcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffInDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / 86_400_000);
}

/** ISO weekday: 1 = maandag … 7 = zondag */
export function isoWeekday(date: IsoDate): number {
  const day = toUtcDate(date).getUTCDay();
  return day === 0 ? 7 : day;
}

export function startOfWeek(date: IsoDate): IsoDate {
  return addDays(date, 1 - isoWeekday(date));
}

export function startOfMonth(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: IsoDate): IsoDate {
  const [y, m] = date.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${date.slice(0, 7)}-${String(last).padStart(2, "0")}`;
}

export function addMonths(date: IsoDate, months: number): IsoDate {
  const [y, m] = date.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return d.toISOString().slice(0, 10);
}

export function eachDay(from: IsoDate, to: IsoDate): IsoDate[] {
  const days: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

export interface ZonedNow {
  date: IsoDate;
  minutes: number;
}

/** Current date and minute-of-day in the shop's time zone. */
export function zonedNow(now: Date = new Date(), timeZone = SHOP_TIME_ZONE): ZonedNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** Converts a local shop date + minute-of-day to a UTC instant (DST aware). */
export function zonedToUtc(date: IsoDate, minutes: number, timeZone = SHOP_TIME_ZONE): Date {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  // The offset at the guessed instant; repeat once to settle around DST transitions.
  let utc = guess - offsetMs(new Date(guess), timeZone);
  utc = guess - offsetMs(new Date(utc), timeZone);
  return new Date(utc);
}

function offsetMs(instant: Date, timeZone: string): number {
  const local = zonedNow(instant, timeZone);
  const [y, m, d] = local.date.split("-").map(Number);
  const asUtc = Date.UTC(y, m - 1, d, Math.floor(local.minutes / 60), local.minutes % 60);
  const truncated = Math.floor(instant.getTime() / 60_000) * 60_000;
  return asUtc - truncated;
}

/** Minutes from `now` until the given local date/time (negative if in the past). */
export function minutesUntil(date: IsoDate, minutes: number, now: ZonedNow): number {
  return diffInDays(now.date, date) * 1440 + (minutes - now.minutes);
}
