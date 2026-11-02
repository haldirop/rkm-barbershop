import type { Locale } from "@/i18n/config";
import { subtractInterval, type Interval } from "./availability";
import { formatDateLong, weekdayName } from "./format";
import { addDays, isoWeekday, minutesToTime, timeToMinutes, type IsoDate, type ZonedNow } from "./time";

export interface OpeningDay {
  weekday: number;
  isOpen: boolean;
  open: string;
  close: string;
}

export interface OpenStatus {
  isOpen: boolean;
  label: string;
}

/** A block for the whole shop (Openingstijden → Blokkades); without times it lasts all day. */
export interface ShopClosure {
  startDate: IsoDate;
  endDate: IsoDate;
  startTime: string | null;
  endTime: string | null;
}

/** When the shop is open on a date: the regular hours minus whole-shop blocks. */
function openIntervals(days: OpeningDay[], closures: ShopClosure[], date: IsoDate): Interval[] {
  const day = days.find((d) => d.weekday === isoWeekday(date));
  if (!day?.isOpen) return [];
  let open: Interval[] = [{ start: timeToMinutes(day.open), end: timeToMinutes(day.close) }];
  for (const c of closures) {
    if (c.startDate > date || c.endDate < date) continue;
    open = subtractInterval(open, {
      start: c.startTime ? timeToMinutes(c.startTime) : 0,
      end: c.endTime ? timeToMinutes(c.endTime) : 24 * 60,
    });
  }
  return open;
}

/** "morgen", "dinsdag", or — further ahead, e.g. after a closed period — "maandag 2 november". */
function whenLabel(date: IsoDate, offset: number, locale: Locale): string {
  const later = offset < 7 ? weekdayName(isoWeekday(date), locale) : formatDateLong(date, false, locale);
  if (locale === "en") return offset === 1 ? "tomorrow" : `on ${later}`;
  if (locale === "de") return offset === 1 ? "morgen" : `am ${later}`;
  return offset === 1 ? "morgen" : later;
}

const LABELS = {
  nl: {
    openUntil: (t: string) => `Nu open · tot ${t}`,
    openFrom: (t: string) => `Vandaag open vanaf ${t}`,
    againToday: (t: string) => `Gesloten · vandaag weer open om ${t}`,
    againOn: (when: string, t: string) => `Gesloten · ${when} weer open om ${t}`,
    closed: "Gesloten",
  },
  en: {
    openUntil: (t: string) => `Open now · until ${t}`,
    openFrom: (t: string) => `Open today from ${t}`,
    againToday: (t: string) => `Closed · open again today at ${t}`,
    againOn: (when: string, t: string) => `Closed · open again ${when} at ${t}`,
    closed: "Closed",
  },
  de: {
    openUntil: (t: string) => `Jetzt geöffnet · bis ${t}`,
    openFrom: (t: string) => `Heute geöffnet ab ${t}`,
    againToday: (t: string) => `Geschlossen · heute wieder ab ${t} geöffnet`,
    againOn: (when: string, t: string) => `Geschlossen · ${when} wieder ab ${t} geöffnet`,
    closed: "Geschlossen",
  },
} satisfies Record<Locale, unknown>;

/**
 * "Nu open · tot 18:00", "Vandaag open vanaf 09:00", "Gesloten · dinsdag weer open om 09:00",
 * "Gesloten · maandag 2 november weer open om 12:00" (and the same in English or German).
 * Takes blocks into account, so a holiday or an opening date in the future is shown correctly.
 */
export function openStatus(
  days: OpeningDay[],
  now: ZonedNow,
  closures: ShopClosure[] = [],
  searchDays = 120,
  locale: Locale = "nl",
): OpenStatus {
  const t = LABELS[locale];
  const today = openIntervals(days, closures, now.date);
  for (const iv of today) {
    if (now.minutes >= iv.start && now.minutes < iv.end) {
      return { isOpen: true, label: t.openUntil(minutesToTime(iv.end)) };
    }
    if (now.minutes < iv.start) {
      // Before opening, or during a break in the day (e.g. closed 12:00–13:00).
      return today[0] === iv
        ? { isOpen: false, label: t.openFrom(minutesToTime(iv.start)) }
        : { isOpen: false, label: t.againToday(minutesToTime(iv.start)) };
    }
  }
  for (let offset = 1; offset <= searchDays; offset++) {
    const date = addDays(now.date, offset);
    const [first] = openIntervals(days, closures, date);
    if (first) {
      return { isOpen: false, label: t.againOn(whenLabel(date, offset, locale), minutesToTime(first.start)) };
    }
  }
  return { isOpen: false, label: t.closed };
}

/** Groups consecutive days with identical hours: "ma – wo 09:00 – 18:00". */
export function groupOpeningDays(days: OpeningDay[]) {
  const groups: Array<{ from: number; to: number; isOpen: boolean; open: string; close: string }> = [];
  for (const day of [...days].sort((a, b) => a.weekday - b.weekday)) {
    const last = groups.at(-1);
    if (
      last &&
      last.to === day.weekday - 1 &&
      last.isOpen === day.isOpen &&
      (!day.isOpen || (last.open === day.open && last.close === day.close))
    ) {
      last.to = day.weekday;
    } else {
      groups.push({ from: day.weekday, to: day.weekday, isOpen: day.isOpen, open: day.open, close: day.close });
    }
  }
  return groups;
}
