import { INTL_LOCALE, type Locale } from "@/i18n/config";
import { addDays, diffInDays, isoWeekday, minutesToTime, type IsoDate } from "./time";

const LOCALE = "nl-NL";

/** Weekday names per language (index 0 = Monday). Dutch ones are lower case, as written in Dutch. */
const WEEKDAYS: Record<Locale, string[]> = {
  nl: ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  de: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"],
};
const WEEKDAYS_SHORT: Record<Locale, string[]> = {
  nl: ["ma", "di", "wo", "do", "vr", "za", "zo"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
};

/** ISO weekday (1-7) → "maandag" / "Monday" / "Montag" */
export function weekdayName(weekday: number, locale: Locale = "nl"): string {
  return WEEKDAYS[locale][weekday - 1] ?? "";
}

export function weekdayShort(weekday: number, locale: Locale = "nl"): string {
  return WEEKDAYS_SHORT[locale][weekday - 1] ?? "";
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const euro = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" });
const euroFormats = new Map<string, Intl.NumberFormat>();
function euroFormat(locale: Locale, rounded: boolean) {
  const key = `${locale}${rounded}`;
  let format = euroFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: "currency",
      currency: "EUR",
      ...(rounded ? { minimumFractionDigits: 0, maximumFractionDigits: 2 } : {}),
    });
    euroFormats.set(key, format);
  }
  return format;
}

/** 2500 → "€ 25" ; 2250 → "€ 22,50" (English "€22.50", German "22,50 €") */
export function formatPrice(cents: number, locale: Locale = "nl"): string {
  return euroFormat(locale, cents % 100 === 0).format(cents / 100);
}

/** Always with cents, for receipts and till totals: 2500 → "€ 25,00" */
export function formatAmount(cents: number): string {
  return euro.format(cents / 100);
}

export function formatDuration(minutes: number, locale: Locale = "nl"): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (locale === "en") {
    if (minutes < 60) return `${minutes} min`;
    return m ? `${h} h ${m} min` : `${h} ${h === 1 ? "hour" : "hours"}`;
  }
  if (locale === "de") {
    if (minutes < 60) return `${minutes} Min.`;
    return m ? `${h} Std. ${m} Min.` : `${h} ${h === 1 ? "Stunde" : "Stunden"}`;
  }
  if (minutes < 60) return `${minutes} min`;
  return m ? `${h} u ${m} min` : `${h} uur`;
}

function asDate(date: IsoDate): Date {
  return new Date(`${date}T12:00:00Z`);
}

/** "dinsdag 14 oktober" / "Tuesday 14 October" / "Dienstag, 14. Oktober" */
export function formatDateLong(date: IsoDate, withYear = false, locale: Locale = "nl"): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(asDate(date));
}

/** "di 14 okt" */
export function formatDateShort(date: IsoDate, locale: Locale = "nl"): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
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
export function formatMonth(date: IsoDate, locale: Locale = "nl"): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: "long", year: "numeric", timeZone: "UTC" }).format(
    asDate(date),
  );
}

const TODAY_TOMORROW: Record<Locale, [string, string]> = {
  nl: ["Vandaag", "Morgen"],
  en: ["Today", "Tomorrow"],
  de: ["Heute", "Morgen"],
};

/** "Vandaag", "Morgen", "Vrijdag" (this week) or "Vrijdag 17 oktober". */
export function relativeDayLabel(date: IsoDate, today: IsoDate, locale: Locale = "nl"): string {
  const diff = diffInDays(today, date);
  if (diff === 0) return TODAY_TOMORROW[locale][0];
  if (diff === 1) return TODAY_TOMORROW[locale][1];
  if (diff > 1 && diff < 7) return capitalize(weekdayName(isoWeekday(date), locale));
  return capitalize(formatDateLong(date, false, locale));
}

/**
 * A day inside a sentence: "morgen" / "donderdag 5 november" (Dutch), "tomorrow" /
 * "on Thursday 5 November" (English), "morgen" / "am Donnerstag, 5. November" (German).
 * `withDate` says whether adding the full date in brackets helps (only after "tomorrow").
 */
export function relativeDayPhrase(date: IsoDate, today: IsoDate, locale: Locale = "nl"): { day: string; withDate: boolean } {
  const diff = diffInDays(today, date);
  if (diff <= 1) return { day: relativeDayLabel(date, today, locale).toLowerCase(), withDate: diff === 1 };
  const full = formatDateLong(date, false, locale);
  if (locale === "en") return { day: `on ${full}`, withDate: false };
  if (locale === "de") return { day: `am ${full}`, withDate: false };
  return { day: full, withDate: false };
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
