/**
 * Booking for several people at once ("ik kom met mijn zoon"): the appointments follow each
 * other with the same barber, with the shop's buffer between them, like separate customers.
 */

/** At most this many people in one booking. */
export const MAX_PEOPLE = 4;

/** Total time to reserve: every treatment plus the buffer between them. */
export function groupDuration(durations: number[], bufferMinutes: number): number {
  return durations.reduce((sum, d) => sum + d, 0) + bufferMinutes * Math.max(0, durations.length - 1);
}

/** Start and end (minutes since midnight) of each person's appointment within the block. */
export function planSequence(start: number, durations: number[], bufferMinutes: number) {
  const times: Array<{ start: number; end: number }> = [];
  let at = start;
  for (const d of durations) {
    times.push({ start: at, end: at + d });
    at += d + bufferMinutes;
  }
  return times;
}
