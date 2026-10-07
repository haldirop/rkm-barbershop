import { weekdayName } from "./format";
import { isoWeekday, timeToMinutes, type ZonedNow } from "./time";

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

/** "Nu open · tot 18:00", "Vandaag open vanaf 09:00", "Gesloten · dinsdag weer open om 09:00". */
export function openStatus(days: OpeningDay[], now: ZonedNow, closedToday = false): OpenStatus {
  const todayIndex = isoWeekday(now.date);
  const today = days.find((d) => d.weekday === todayIndex);
  if (today?.isOpen && !closedToday) {
    const open = timeToMinutes(today.open);
    const close = timeToMinutes(today.close);
    if (now.minutes >= open && now.minutes < close) {
      return { isOpen: true, label: `Nu open · tot ${today.close}` };
    }
    if (now.minutes < open) return { isOpen: false, label: `Vandaag open vanaf ${today.open}` };
  }
  for (let offset = 1; offset <= 7; offset++) {
    const weekday = ((todayIndex - 1 + offset) % 7) + 1;
    const next = days.find((d) => d.weekday === weekday);
    if (next?.isOpen) {
      const when = offset === 1 ? "morgen" : weekdayName(weekday);
      return { isOpen: false, label: `Gesloten · ${when} weer open om ${next.open}` };
    }
  }
  return { isOpen: false, label: "Gesloten" };
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
