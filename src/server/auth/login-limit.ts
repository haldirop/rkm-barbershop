/**
 * Limits on wrong passwords at the admin login, against someone guessing passwords.
 * While a limit is reached even the right password is refused, so the messages say exactly
 * until when, and warn before the last attempts.
 */

export const LOGIN_WINDOW_MINUTES = 15;
/** Wrong passwords per e-mail address within the window. */
export const LOGIN_LIMIT_PER_EMAIL = 5;
/**
 * Wrong passwords per network (IP address) within the window. Higher than per address,
 * because the till and everyone's phone in the shop share the same wifi; it only stops
 * someone trying many different addresses.
 */
export const LOGIN_LIMIT_PER_NETWORK = 20;

const clock = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit" });

/** "Te veel mislukte pogingen. Je kunt weer inloggen om 14:32 (over 12 minuten)." */
export function lockedState(until: Date, now: Date = new Date()): { error: string; retryAfterSeconds: number } {
  const seconds = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 1000));
  const minutes = Math.ceil(seconds / 60);
  return {
    error: `Te veel mislukte pogingen. Je kunt weer inloggen om ${clock.format(until)} (over ${minutes} ${minutes === 1 ? "minuut" : "minuten"}).`,
    retryAfterSeconds: seconds,
  };
}

/** Adds a warning to a failed login when only a few attempts are left. */
export function withAttemptsLeft(error: string, left: number): string {
  if (left > 2 || left < 1) return error;
  return `${error} Nog ${left} ${left === 1 ? "poging" : "pogingen"}, daarna kun je ${LOGIN_WINDOW_MINUTES} minuten niet inloggen.`;
}

/** The latest of several unlock moments (null when none is locked). */
export function latest(dates: Array<Date | null>): Date | null {
  return dates.reduce<Date | null>((max, d) => (d && (!max || d > max) ? d : max), null);
}
