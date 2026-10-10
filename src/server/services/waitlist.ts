import "server-only";
import { and, asc, count, eq, gte, inArray, isNull, lt, lte, sql } from "drizzle-orm";
import { zonedNow, type IsoDate, type ZonedNow } from "@/lib/time";
import { getDb, type DbOrTx } from "@/server/db/client";
import { availabilityAlerts, barbers, services, type AvailabilityAlert } from "@/server/db/schema";
import { notifyAvailabilityAlert } from "@/server/notifications/notify";
import { bookingWindow, getDayAvailability } from "./availability";
import { loadSettings } from "./settings";
import { DomainError } from "./shared";

/**
 * "Houd me op de hoogte" for fully booked days.
 *
 * A customer leaves an e-mail address for a day without free times. Whenever
 * something may have freed up room (a cancellation, a rejected request, a moved
 * appointment, a removed block, changed hours) `processAvailabilityAlerts` checks
 * every open sign-up and sends one e-mail per sign-up as soon as a time is free.
 */

/** Open sign-ups per e-mail address, so the form can't be used to flood an inbox. */
const MAX_OPEN_ALERTS_PER_EMAIL = 5;

export interface AlertInput {
  serviceId: string;
  /** null = any barber */
  barberId: string | null;
  date: IsoDate;
  email: string;
}

export async function createAvailabilityAlert(
  input: AlertInput,
  opts: { now?: ZonedNow } = {},
  db: DbOrTx = getDb(),
): Promise<AvailabilityAlert> {
  const now = opts.now ?? zonedNow();
  const email = input.email.trim().toLowerCase();
  const window = bookingWindow(await loadSettings(db), now);
  if (input.date < window.firstDate || input.date > window.lastDate) {
    throw new DomainError("Voor deze datum kun je je niet aanmelden.");
  }

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, input.serviceId), eq(services.isActive, true)));
  if (!service) throw new DomainError("Deze behandeling bestaat niet meer. Kies opnieuw een behandeling.");
  if (input.barberId) {
    const [barber] = await db
      .select({ id: barbers.id })
      .from(barbers)
      .where(and(eq(barbers.id, input.barberId), eq(barbers.isActive, true)));
    if (!barber) throw new DomainError("Deze barber is niet beschikbaar. Kies opnieuw.");
  }

  const day = await getDayAvailability(
    input.date,
    { durationMinutes: service.durationMinutes, barberId: input.barberId, now },
    db,
  );
  if (day.slots.length) throw new DomainError("Er zijn op deze dag nog tijden vrij: kies er gerust een.");
  if (day.level !== "full") throw new DomainError("Op deze dag zijn we gesloten.");

  const sameAlert = and(
    eq(availabilityAlerts.date, input.date),
    eq(availabilityAlerts.serviceId, input.serviceId),
    sql`${availabilityAlerts.barberId} IS NOT DISTINCT FROM ${input.barberId}`,
    eq(availabilityAlerts.email, email),
  );
  // Signed up before (and maybe already e-mailed while the day was briefly free): start over.
  const [renewed] = await db
    .update(availabilityAlerts)
    .set({ notifiedAt: null, lastError: null, createdAt: new Date() })
    .where(sameAlert)
    .returning();
  if (renewed) return renewed;

  const [{ open }] = await db
    .select({ open: count() })
    .from(availabilityAlerts)
    .where(
      and(
        eq(availabilityAlerts.email, email),
        isNull(availabilityAlerts.notifiedAt),
        gte(availabilityAlerts.date, now.date),
      ),
    );
  if (open >= MAX_OPEN_ALERTS_PER_EMAIL) {
    throw new DomainError(
      "Je staat al voor meerdere dagen op de lijst. Je krijgt bericht zodra daar een plek vrijkomt.",
      "LIMIT",
    );
  }

  const [created] = await db
    .insert(availabilityAlerts)
    .values({ date: input.date, serviceId: input.serviceId, barberId: input.barberId, email })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  // Two identical sign-ups at the same moment: the other one won, which is fine.
  const [existing] = await db.select().from(availabilityAlerts).where(sameAlert);
  return existing;
}

export interface FreedUpSpot {
  alert: AvailabilityAlert;
  serviceName: string;
  barberName: string | null;
  /** The first free start times, e.g. ["14:00", "14:30"]. */
  times: string[];
}

export type SendOutcome = { ok: boolean; error?: string };

/**
 * Sends "er is een plek vrijgekomen" for every open sign-up whose day has room again,
 * and removes sign-ups for days that have passed. Safe to run often and in parallel.
 * A sign-up whose e-mail could not be sent stays on the list and is tried again next time.
 */
export async function processAvailabilityAlerts(
  opts: { now?: ZonedNow; send?: (spot: FreedUpSpot) => Promise<SendOutcome> } = {},
  db: DbOrTx = getDb(),
): Promise<{ notified: number; failed: number; removed: number }> {
  const now = opts.now ?? zonedNow();
  // Nothing to tell anymore, and the e-mail address isn't kept longer than needed.
  const removed = await db
    .delete(availabilityAlerts)
    .where(lt(availabilityAlerts.date, now.date))
    .returning({ id: availabilityAlerts.id });

  const open = await db
    .select()
    .from(availabilityAlerts)
    .where(isNull(availabilityAlerts.notifiedAt))
    .orderBy(asc(availabilityAlerts.createdAt));
  if (!open.length) return { notified: 0, failed: 0, removed: removed.length };

  const send = opts.send ?? notifyAvailabilityAlert;
  const serviceRows = await db
    .select()
    .from(services)
    .where(inArray(services.id, [...new Set(open.map((a) => a.serviceId))]));
  const barberRows = await db.select({ id: barbers.id, name: barbers.name }).from(barbers);

  // One availability check per day + treatment + barber, however many people wait for it.
  const groups = new Map<string, AvailabilityAlert[]>();
  for (const alert of open) {
    const key = `${alert.date}|${alert.serviceId}|${alert.barberId ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), alert]);
  }

  let notified = 0;
  let failed = 0;
  for (const alerts of groups.values()) {
    const { date, serviceId, barberId } = alerts[0];
    const service = serviceRows.find((s) => s.id === serviceId);
    if (!service?.isActive) continue;
    const day = await getDayAvailability(date, { durationMinutes: service.durationMinutes, barberId, now }, db);
    if (!day.slots.length) continue;

    // Claim first, then send: a parallel run can never e-mail the same person twice.
    const claimed = await db
      .update(availabilityAlerts)
      .set({ notifiedAt: new Date(), lastError: null })
      .where(
        and(
          inArray(
            availabilityAlerts.id,
            alerts.map((a) => a.id),
          ),
          isNull(availabilityAlerts.notifiedAt),
        ),
      )
      .returning();
    for (const alert of claimed) {
      const spot: FreedUpSpot = {
        alert,
        serviceName: service.name,
        barberName: barberId ? (barberRows.find((b) => b.id === barberId)?.name ?? null) : null,
        times: day.slots.slice(0, 4).map((s) => s.time),
      };
      const outcome = await send(spot).catch((error: unknown): SendOutcome => {
        console.error("[wachtlijst] Versturen mislukt:", error);
        return { ok: false };
      });
      if (outcome.ok) {
        notified++;
        continue;
      }
      // Not sent (e.g. Resend refused it): back on the list, with the reason for the admin.
      failed++;
      await db
        .update(availabilityAlerts)
        .set({ notifiedAt: null, lastError: outcome.error ?? "Onbekende fout bij het versturen." })
        .where(eq(availabilityAlerts.id, alert.id));
    }
  }
  return { notified, failed, removed: removed.length };
}

/** For `after()`: checks the waiting list, and never lets a failure surface. */
export async function checkAvailabilityAlerts() {
  try {
    await processAvailabilityAlerts();
  } catch (error) {
    console.error("[wachtlijst] Controle mislukt:", error);
  }
}

// ——— Beheer ———

export interface WaitlistEntry {
  id: string;
  date: IsoDate;
  email: string;
  serviceName: string;
  /** null = no preference */
  barberName: string | null;
  createdAt: Date;
  /** Set once the "plek vrij" e-mail has gone out. */
  notifiedAt: Date | null;
  /** Why the last attempt to send that e-mail failed; it is retried at the next check. */
  lastError: string | null;
}

/** All sign-ups from `from` onwards, by date, oldest sign-up first. */
export async function listWaitlist(from: IsoDate, db: DbOrTx = getDb()): Promise<WaitlistEntry[]> {
  return db
    .select({
      id: availabilityAlerts.id,
      date: availabilityAlerts.date,
      email: availabilityAlerts.email,
      serviceName: services.name,
      barberName: barbers.name,
      createdAt: availabilityAlerts.createdAt,
      notifiedAt: availabilityAlerts.notifiedAt,
      lastError: availabilityAlerts.lastError,
    })
    .from(availabilityAlerts)
    .innerJoin(services, eq(services.id, availabilityAlerts.serviceId))
    .leftJoin(barbers, eq(barbers.id, availabilityAlerts.barberId))
    .where(gte(availabilityAlerts.date, from))
    .orderBy(asc(availabilityAlerts.date), asc(availabilityAlerts.createdAt));
}

/** People still waiting (no e-mail sent yet) per date in a range, e.g. for the agenda. */
export async function countWaitingByDate(
  from: IsoDate,
  to: IsoDate,
  db: DbOrTx = getDb(),
): Promise<Array<{ date: IsoDate; waiting: number }>> {
  return db
    .select({ date: availabilityAlerts.date, waiting: count() })
    .from(availabilityAlerts)
    .where(
      and(
        gte(availabilityAlerts.date, from),
        lte(availabilityAlerts.date, to),
        isNull(availabilityAlerts.notifiedAt),
      ),
    )
    .groupBy(availabilityAlerts.date)
    .orderBy(asc(availabilityAlerts.date));
}

export async function deleteAvailabilityAlert(id: string, db: DbOrTx = getDb()) {
  const [deleted] = await db.delete(availabilityAlerts).where(eq(availabilityAlerts.id, id)).returning();
  if (!deleted) throw new DomainError("Deze aanmelding bestaat niet meer.", "NOT_FOUND");
}
