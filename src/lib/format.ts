import { addDays, diffInDays, minutesToTime, type IsoDate } from "./time";

const LOCALE = "nl-NL";

const WEEKDAYS = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];
const WEEKDAYS_SHORT = ["ma", "di", "wo", "do", "vr", "za", "zo"];

/** ISO weekday (1-7) → "maandag" */
export function weekdayName(weekday: number): string {
  return WEEKDAYS[weekday - 1] ?? "";
}

export function weekdayShort(weekday: number): string {
  return WEEKDAYS_SHORT[weekday - 1] ?? "";
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const euro = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" });
const euroRounded = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 2500 → "€ 25" ; 2250 → "€ 22,50" */
export function formatPrice(cents: number): string {
  return (cents % 100 === 0 ? euroRounded : euro).format(cents / 100);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} u ${m} min` : `${h} uur`;
}

function asDate(date: IsoDate): Date {
  return new Date(`${date}T12:00:00Z`);
}

/** "dinsdag 14 oktober" */
export function formatDateLong(date: IsoDate, withYear = false): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(asDate(date));
}

/** "di 14 okt" */
export function formatDateShort(date: IsoDate): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(asDate(date));
}

/** "14-10-2026" */
export function formatDateNumeric(date: IsoDate): string {
  const [y, m, d] = date.split("-");
  return `${d}-${m}-${y}`;
}

/** "oktober 2026" */
export function formatMonth(date: IsoDate): string {
  return new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    asDate(date),
  );
}

/** "Vandaag", "Morgen", or "Vrijdag 17 oktober". */
export function relativeDayLabel(date: IsoDate, today: IsoDate): string {
  const diff = diffInDays(today, date);
  if (diff === 0) return "Vandaag";
  if (diff === 1) return "Morgen";
  if (diff > 1 && diff < 7) return capitalize(formatDateLong(date).split(" ")[0]);
  return capitalize(formatDateLong(date));
}

export function formatTimeRange(start: number, end: number): string {
  return `${minutesToTime(start)} – ${minutesToTime(end)}`;
}

export function formatDateTime(value: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(value));
}

export function isTomorrow(date: IsoDate, today: IsoDate): boolean {
  return addDays(today, 1) === date;
}

export function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
