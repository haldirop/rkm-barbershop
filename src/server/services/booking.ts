import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import type { Locale } from "@/i18n/config";
import type { CustomerMessage } from "@/i18n/errors";
import { daySlots, pickBarber } from "@/lib/availability";
import { groupDuration, MAX_PEOPLE, planSequence } from "@/lib/booking-group";
import { ACTIVE_STATUSES } from "@/lib/status";
import { minutesToTime, minutesUntil, timeToMinutes, zonedNow, type IsoDate, type ZonedNow } from "@/lib/time";
import { getDb, type Database, type DbOrTx } from "@/server/db/client";
import { appointments, barbers, customers, services, type Appointment, type Settings } from "@/server/db/schema";
import { createManageToken, verifyManageToken } from "@/server/security";
import { bookingWindow, buildDay, loadSchedule, rulesForDate } from "./availability";
import { loadSettings } from "./settings";
import { DomainError, isOverlapViolation, lockBookings, logEvent, SLOT_TAKEN_MESSAGE } from "./shared";

export interface BookingCompanion {
  serviceId: string;
  /** e.g. "Daan"; null = not given */
  name: string | null;
}

export interface BookingInput {
  serviceId: string;
  /** Who the first treatment is for, when that isn't the customer (null = the customer). */
  name?: string | null;
  /** More people in the same booking, one after another with the same barber. */
  companions?: BookingCompanion[];
  /** null = geen voorkeur */
  barberId: string | null;
  date: IsoDate;
  startTime: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string | null;
  /** The language of the website the customer booked on (default Dutch). */
  locale?: Locale;
}

interface SlotChoice {
  durationMinutes: number;
  barberId: string | null;
  date: IsoDate;
  startTime: string;
  excludeAppointmentIds?: string[];
}

/**
 * Re-checks availability with fresh data inside the (locked) transaction and
 * returns the barber that will take the slot. Throws SLOT_TAKEN when it no longer fits.
 */
async function claimSlot(tx: Database, choice: SlotChoice, now: ZonedNow) {
  const schedule = await loadSchedule(choice.date, choice.date, tx);
  const rules = rulesForDate(
    schedule.settings,
    choice.durationMinutes,
    choice.date,
    bookingWindow(schedule.settings, now),
    choice.excludeAppointmentIds,
  );
  if (!rules) {
    throw new DomainError("Op deze datum kun je online geen afspraak maken.", "INVALID", { key: "noOnlineBooking" });
  }

  const start = timeToMinutes(choice.startTime);
  const day = buildDay(schedule, choice.date);
  const slot = daySlots(day, rules, choice.barberId ? [choice.barberId] : undefined).find(
    (s) => s.start === start,
  );
  if (!slot) throw new DomainError(SLOT_TAKEN_MESSAGE, "SLOT_TAKEN");

  const barberId = choice.barberId ?? pickBarber(day, slot.barberIds);
  const barber = schedule.barbers.find((b) => b.id === barberId);
  if (!barber) throw new DomainError(SLOT_TAKEN_MESSAGE, "SLOT_TAKEN");

  return {
    barber,
    startTime: minutesToTime(start),
    endTime: minutesToTime(start + choice.durationMinutes),
    settings: schedule.settings,
  };
}

export async function createBookingRequest(
  input: BookingInput,
  opts: { now?: ZonedNow } = {},
  db: Database = getDb(),
) {
  const now = opts.now ?? zonedNow();
  const people: BookingCompanion[] = [{ serviceId: input.serviceId, name: input.name ?? null }, ...(input.companions ?? [])];
  if (people.length > MAX_PEOPLE) {
    throw new DomainError(`Je kunt voor maximaal ${MAX_PEOPLE} personen tegelijk boeken.`, "INVALID", { key: "invalidRequest" });
  }
  const serviceRows = await db
    .select()
    .from(services)
    .where(inArray(services.id, [...new Set(people.map((p) => p.serviceId))]));
  const serviceById = new Map(serviceRows.map((row) => [row.id, row]));
  if (people.some((p) => !serviceById.get(p.serviceId)?.isActive)) {
    throw new DomainError("Deze behandeling is niet (meer) online te boeken.", "INVALID", { key: "serviceUnavailable" });
  }
  if (input.barberId) {
    const [barber] = await db.select().from(barbers).where(eq(barbers.id, input.barberId));
    if (!barber?.isActive) {
      throw new DomainError("Deze barber is niet (meer) beschikbaar.", "INVALID", { key: "barberUnavailable" });
    }
  }

  try {
    return await db.transaction(async (tx) => {
      await lockBookings(tx);

      const [existing] = await tx
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.email, input.email));
      const settings = await loadSettings(tx);
      if (existing) await assertOpenAppointmentLimit(tx, existing.id, settings, now);

      // Several people: one block with the same barber, the treatments one after another.
      const durations = people.map((p) => serviceById.get(p.serviceId)!.durationMinutes);
      const slot = await claimSlot(
        tx,
        {
          durationMinutes: groupDuration(durations, settings.bufferMinutes),
          barberId: input.barberId,
          date: input.date,
          startTime: input.startTime,
        },
        now,
      );

      const [customer] = await tx
        .insert(customers)
        .values({
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          preferredBarberId: input.barberId,
        })
        .onConflictDoUpdate({
          target: customers.email,
          targetWhere: sql`${customers.email} IS NOT NULL`,
          set: {
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            ...(input.barberId ? { preferredBarberId: input.barberId } : {}),
            updatedAt: new Date(),
          },
        })
        .returning();

      const groupId = people.length > 1 ? randomUUID() : null;
      const times = planSequence(timeToMinutes(slot.startTime), durations, settings.bufferMinutes);
      const created: Appointment[] = [];
      for (const [i, person] of people.entries()) {
        const service = serviceById.get(person.serviceId)!;
        const [appointment] = await tx
          .insert(appointments)
          .values({
            customerId: customer.id,
            barberId: slot.barber.id,
            serviceId: service.id,
            barberName: slot.barber.name,
            serviceName: service.name,
            priceCents: service.priceCents,
            durationMinutes: service.durationMinutes,
            date: input.date,
            startTime: minutesToTime(times[i].start),
            endTime: minutesToTime(times[i].end),
            status: "PENDING",
            anyBarber: input.barberId === null,
            notes: i === 0 ? input.notes : null,
            source: "ONLINE",
            locale: input.locale ?? "nl",
            statusChangedAt: new Date(),
            groupId,
            // null = the customer themself; "" = someone in the group without a name.
            guestName: i === 0 ? person.name : (person.name ?? ""),
          })
          .returning();
        await logEvent(tx, {
          appointmentId: appointment.id,
          type: "CREATED",
          actor: "CUSTOMER",
          message: groupId ? `Samen geboekt voor ${people.length} personen.` : undefined,
        });
        created.push(appointment);
      }

      return { appointment: created[0], appointments: created, customer, token: createManageToken(created[0].id) };
    });
  } catch (error) {
    if (isOverlapViolation(error)) throw new DomainError(SLOT_TAKEN_MESSAGE, "SLOT_TAKEN");
    throw error;
  }
}

async function assertOpenAppointmentLimit(
  tx: Database,
  customerId: string,
  settings: Settings,
  now: ZonedNow,
) {
  // A booking for several people counts once.
  const [{ open }] = await tx
    .select({ open: sql<number>`COUNT(DISTINCT COALESCE(${appointments.groupId}, ${appointments.id}))`.mapWith(Number) })
    .from(appointments)
    .where(
      and(
        eq(appointments.customerId, customerId),
        inArray(appointments.status, [...ACTIVE_STATUSES]),
        gte(appointments.date, now.date),
      ),
    );
  if (open >= settings.maxOpenAppointmentsPerCustomer) {
    throw new DomainError(
      `Je hebt al ${open} openstaande afspraken. Neem contact met ons op als je meer afspraken wilt plannen.`,
      "LIMIT",
      { key: "openLimit", arg: open },
    );
  }
}

// ---------------------------------------------------------------------------
// Beheren via beveiligde link
// ---------------------------------------------------------------------------

/** Statuses of a booking that is still on: a group moves or is cancelled together in these. */
const OPEN_STATUSES = ["PENDING", "APPROVED"] as const;
const isOpen = (a: Pick<Appointment, "status">) => (OPEN_STATUSES as readonly string[]).includes(a.status);

/** The appointments booked together with this one (itself included), in time order. */
export async function loadGroup(appointment: Appointment, db: DbOrTx = getDb()): Promise<Appointment[]> {
  if (!appointment.groupId) return [appointment];
  return db
    .select()
    .from(appointments)
    .where(eq(appointments.groupId, appointment.groupId))
    .orderBy(asc(appointments.startTime));
}

/**
 * The appointment behind a manage link, with everyone booked together with it. `appointment` is
 * the first one that is still on (or the linked one when none is), so a group is shown and
 * changed as one booking.
 */
export async function getAppointmentByToken(token: string, db: Database = getDb()) {
  const id = verifyManageToken(token);
  if (!id) return null;
  const [row] = await db
    .select({ appointment: appointments, customer: customers })
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .where(eq(appointments.id, id));
  if (!row) return null;
  const group = await loadGroup(row.appointment, db);
  return { ...row, appointment: group.find(isOpen) ?? row.appointment, group };
}

export type ManagedAppointment = NonNullable<Awaited<ReturnType<typeof getAppointmentByToken>>>;

export interface ChangePolicy {
  allowed: boolean;
  reason?: string;
  /** The same reason, for the customer's language. */
  message?: CustomerMessage;
}

/** Whether the customer may still cancel or move this appointment online. */
export function customerChangePolicy(
  appointment: Pick<typeof appointments.$inferSelect, "status" | "date" | "startTime">,
  settings: Pick<Settings, "cancellationCutoffHours">,
  now: ZonedNow = zonedNow(),
): ChangePolicy {
  if (appointment.status !== "PENDING" && appointment.status !== "APPROVED") {
    return { allowed: false, reason: "Deze afspraak kan niet meer worden gewijzigd.", message: { key: "notChangeable" } };
  }
  const minutesLeft = minutesUntil(appointment.date, timeToMinutes(appointment.startTime), now);
  if (minutesLeft <= 0) {
    return { allowed: false, reason: "Deze afspraak is al begonnen of voorbij.", message: { key: "alreadyStarted" } };
  }
  // An unconfirmed request can always be withdrawn; confirmed ones respect the cutoff.
  if (appointment.status === "APPROVED" && minutesLeft < settings.cancellationCutoffHours * 60) {
    return {
      allowed: false,
      reason: `Wijzigen of annuleren kan online tot ${settings.cancellationCutoffHours} uur van tevoren. Bel ons even, dan kijken we samen naar een oplossing.`,
      message: { key: "cutoff", arg: settings.cancellationCutoffHours },
    };
  }
  return { allowed: true };
}

async function loadForChange(tx: Database, token: string, now: ZonedNow) {
  const id = verifyManageToken(token);
  if (!id) throw new DomainError("Deze link is ongeldig.", "NOT_FOUND", { key: "invalidLink" });
  const [own] = await tx.select().from(appointments).where(eq(appointments.id, id)).for("update");
  if (!own) throw new DomainError("Deze afspraak bestaat niet meer.", "NOT_FOUND", { key: "appointmentGone" });
  const group = own.groupId
    ? await tx.select().from(appointments).where(eq(appointments.groupId, own.groupId)).orderBy(asc(appointments.startTime)).for("update")
    : [own];
  const members = group.filter(isOpen);
  const lead = members[0] ?? own;
  const policy = customerChangePolicy(lead, await loadSettings(tx), now);
  if (!policy.allowed) throw new DomainError(policy.reason!, "NOT_ALLOWED", policy.message);
  return { lead, members };
}

/** Cancels the booking: every person in it that is still on. */
export async function cancelByCustomer(token: string, opts: { now?: ZonedNow } = {}, db: Database = getDb()) {
  const now = opts.now ?? zonedNow();
  return db.transaction(async (tx) => {
    const { lead, members } = await loadForChange(tx, token, now);
    const updated = await tx
      .update(appointments)
      .set({ status: "CANCELLED", cancelledBy: "CUSTOMER", statusChangedAt: new Date() })
      .where(inArray(appointments.id, members.map((m) => m.id)))
      .returning();
    for (const m of members) await logEvent(tx, { appointmentId: m.id, type: "CANCELLED", actor: "CUSTOMER" });
    updated.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return { previous: lead, appointment: updated[0], appointments: updated };
  });
}

/** Moves the booking (all people in it, again one after another) to another moment. */
export async function rescheduleByCustomer(
  token: string,
  target: { date: IsoDate; startTime: string },
  opts: { now?: ZonedNow } = {},
  db: Database = getDb(),
) {
  const now = opts.now ?? zonedNow();
  try {
    return await db.transaction(async (tx) => {
      await lockBookings(tx);
      const { lead, members } = await loadForChange(tx, token, now);
      const settings = await loadSettings(tx);
      const durations = members.map((m) => m.durationMinutes);
      const slot = await claimSlot(
        tx,
        {
          durationMinutes: groupDuration(durations, settings.bufferMinutes),
          barberId: lead.anyBarber ? null : lead.barberId,
          date: target.date,
          startTime: target.startTime,
          excludeAppointmentIds: members.map((m) => m.id),
        },
        now,
      );
      const times = planSequence(timeToMinutes(slot.startTime), durations, settings.bufferMinutes);
      if (members.length > 1) {
        // Out of the overlap check first: one person moving into another's old time would trip it.
        await tx.update(appointments).set({ status: "CANCELLED" }).where(inArray(appointments.id, members.map((m) => m.id)));
      }
      const updated: Appointment[] = [];
      for (const [i, member] of members.entries()) {
        const [row] = await tx
          .update(appointments)
          .set({
            date: target.date,
            startTime: minutesToTime(times[i].start),
            endTime: minutesToTime(times[i].end),
            barberId: slot.barber.id,
            barberName: slot.barber.name,
            // A moved appointment needs to be confirmed again by the shop.
            status: "PENDING",
            statusChangedAt: new Date(),
            reminderSentAt: null,
          })
          .where(eq(appointments.id, member.id))
          .returning();
        await logEvent(tx, {
          appointmentId: member.id,
          type: "RESCHEDULED",
          actor: "CUSTOMER",
          message: `Van ${member.date} ${member.startTime.slice(0, 5)} naar ${target.date} ${row.startTime.slice(0, 5)}`,
        });
        updated.push(row);
      }
      return { previous: lead, appointment: updated[0], appointments: updated };
    });
  } catch (error) {
    if (isOverlapViolation(error)) throw new DomainError(SLOT_TAKEN_MESSAGE, "SLOT_TAKEN");
    throw error;
  }
}
