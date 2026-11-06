import { zonedNow } from "./time";

/** Highest number of years of experience the admin can enter. */
export const MAX_EXPERIENCE_YEARS = 70;

/** The current year in the shop's time zone. */
export function currentYear(now: Date = new Date()): number {
  return Number(zonedNow(now).date.slice(0, 4));
}

/**
 * Years of experience on the website, counted on from the year the barber started, so
 * "20 jaar" becomes "21 jaar" by itself next year. Null (not shown) below one year.
 */
export function experienceYears(since: number | null, year: number): number | null {
  if (since === null) return null;
  const years = year - since;
  return years >= 1 ? years : null;
}

/** The admin types years of experience; the database keeps the year the barber started. */
export function experienceSince(years: number | null, year: number): number | null {
  return years === null ? null : year - years;
}

/** The barber introduced in the large homepage block: the first owner, else the first barber. */
export function featuredBarber<T extends { isOwner: boolean }>(barbers: T[]): T | undefined {
  return barbers.find((b) => b.isOwner) ?? barbers[0];
}

/** An introduction typed in a text box, split into paragraphs at each new line. */
export function paragraphs(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
