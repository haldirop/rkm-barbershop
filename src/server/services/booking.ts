import "server-only";
import { and, count, eq, gte, inArray, sql } from "drizzle-orm";
import { daySlots, pickBarber } from "@/lib/availability";
import { ACTIVE_STATUSES } from "@/lib/status";
import { minutesToTime, minutesUntil, timeToMinutes, zonedNow, type IsoDate, type ZonedNow } from "@/lib/time";
import { getDb, type Database } from "@/server/db/client";
import { appointments, barbers, customers, services, type Settings } from "@/server/db/schema";
import { createManageToken, verifyManageToken } from "@/server/security";
import { bookingWindow, buildDay, loadSchedule, rulesForDate } from "./availability";
import { loadSettings } from "./settings";
import { DomainError, isOverlapViolation, lockBookings, logEvent, SLOT_TAKEN_MESSAGE } from "./shared";

export interface BookingInput {
  serviceId: string;
  /** null = geen voorkeur */
  barberId: string | null;
  date: IsoDate;
  startTime: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string | null;
}

interface SlotChoice {
  durationMinutes: number;
  barberId: string | null;
  date: IsoDate;
  startTime: string;
  excludeAppointmentId?: string;
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
    choice.excludeAppointmentId,
  );
  if (!rules) throw new DomainError("Op deze datum kun je online geen afspraak maken.");

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
  const [service] = await db.select().from(services).where(eq(services.id, input.serviceId));
  if (!service?.isActive) throw new DomainError("Deze behandeling is niet (meer) online te boeken.");
  if (input.barberId) {
    const [barber] = await db.select().from(barbers).where(eq(barbers.id, input.barberId));
    if (!barber?.isActive) throw new DomainError("Deze barber is niet (meer) beschikbaar.");
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

      const slot = await claimSlot(
        tx,
        {
          durationMinutes: service.durationMinutes,
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
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: "PENDING",
          anyBarber: input.barberId === null,
          notes: input.notes,
          source: "ONLINE",
          statusChangedAt: new Date(),
        })
        .returning();

      await logEvent(tx, { appointmentId: appointment.id, type: "CREATED", actor: "CUSTOMER" });

      return { appointment, customer, token: createManageToken(appointment.id) };
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
  const [{ open }] = await tx
    .select({ open: count() })
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
    );
  }
}

// ---------------------------------------------------------------------------
// Beheren via beveiligde link
// ---------------------------------------------------------------------------

export async function getAppointmentByToken(token: string, db: Database = getDb()) {
  const id = verifyManageToken(token);
  if (!id) return null;
  const [row] = await db
    .select({ appointment: appointments, customer: customers })
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .where(eq(appointments.id, id));
  return row ?? null;
}

export type ManagedAppointment = NonNullable<Awaited<ReturnType<typeof getAppointmentByToken>>>;

export interface ChangePolicy {
  allowed: boolean;
  reason?: string;
}

/** Whether the customer may still cancel or move this appointment online. */
export function customerChangePolicy(
  appointment: Pick<typeof appointments.$inferSelect, "status" | "date" | "startTime">,
  settings: Pick<Settings, "cancellationCutoffHours">,
  now: ZonedNow = zonedNow(),
): ChangePolicy {
  if (appointment.status !== "PENDING" && appointment.status !== "APPROVED") {
    return { allowed: false, reason: "Deze afspraak kan niet meer worden gewijzigd." };
  }
  const minutesLeft = minutesUntil(appointment.date, timeToMinutes(appointment.startTime), now);
  if (minutesLeft <= 0) return { allowed: false, reason: "Deze afspraak is al begonnen of voorbij." };
  // An unconfirmed request can always be withdrawn; confirmed ones respect the cutoff.
  if (appointment.status === "APPROVED" && minutesLeft < settings.cancellationCutoffHours * 60) {
    return {
      allowed: false,
      reason: `Wijzigen of annuleren kan online tot ${settings.cancellationCutoffHours} uur van tevoren. Bel ons even, dan kijken we samen naar een oplossing.`,
    };
  }
  return { allowed: true };
}

async function loadForChange(tx: Database, token: string, now: ZonedNow) {
  const id = verifyManageToken(token);
  if (!id) throw new DomainError("Deze link is ongeldig.", "NOT_FOUND");
  const [appointment] = await tx.select().from(appointments).where(eq(appointments.id, id)).for("update");
  if (!appointment) throw new DomainError("Deze afspraak bestaat niet meer.", "NOT_FOUND");
  const policy = customerChangePolicy(appointment, await loadSettings(tx), now);
  if (!policy.allowed) throw new DomainError(policy.reason!, "NOT_ALLOWED");
  return appointment;
}

export async function cancelByCustomer(token: string, opts: { now?: ZonedNow } = {}, db: Database = getDb()) {
  const now = opts.now ?? zonedNow();
  return db.transaction(async (tx) => {
    const appointment = await loadForChange(tx, token, now);
    const [updated] = await tx
      .update(appointments)
      .set({ status: "CANCELLED", cancelledBy: "CUSTOMER", statusChangedAt: new Date() })
      .where(eq(appointments.id, appointment.id))
      .returning();
    await logEvent(tx, { appointmentId: appointment.id, type: "CANCELLED", actor: "CUSTOMER" });
    return { previous: appointment, appointment: updated };
  });
}

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
      const appointment = await loadForChange(tx, token, now);
      const slot = await claimSlot(
        tx,
        {
          durationMinutes: appointment.durationMinutes,
          barberId: appointment.anyBarber ? null : appointment.barberId,
          date: target.date,
          startTime: target.startTime,
          excludeAppointmentId: appointment.id,
        },
        now,
      );
      const [updated] = await tx
        .update(appointments)
        .set({
          date: target.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          barberId: slot.barber.id,
          barberName: slot.barber.name,
          // A moved appointment needs to be confirmed again by the shop.
          status: "PENDING",
          statusChangedAt: new Date(),
          reminderSentAt: null,
        })
        .where(eq(appointments.id, appointment.id))
        .returning();
      await logEvent(tx, {
        appointmentId: appointment.id,
        type: "RESCHEDULED",
        actor: "CUSTOMER",
        message: `Van ${appointment.date} ${appointment.startTime.slice(0, 5)} naar ${target.date} ${slot.startTime}`,
      });
      return { previous: appointment, appointment: updated };
    });
  } catch (error) {
    if (isOverlapViolation(error)) throw new DomainError(SLOT_TAKEN_MESSAGE, "SLOT_TAKEN");
    throw error;
  }
}
