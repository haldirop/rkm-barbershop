import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, lt, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { isActiveStatus, type AppointmentStatus } from "@/lib/status";
import { minutesToTime, timeToMinutes, zonedNow, type IsoDate } from "@/lib/time";
import { getDb, type Database, type DbOrTx } from "@/server/db/client";
import {
  appointmentEvents,
  appointments,
  barbers,
  customers,
  emailLog,
  services,
  adminUsers,
} from "@/server/db/schema";
import { DomainError, isOverlapViolation, lockBookings, logEvent, type EventType } from "./shared";

const listColumns = {
  id: appointments.id,
  date: appointments.date,
  startTime: appointments.startTime,
  endTime: appointments.endTime,
  status: appointments.status,
  serviceName: appointments.serviceName,
  barberName: appointments.barberName,
  barberId: appointments.barberId,
  durationMinutes: appointments.durationMinutes,
  priceCents: appointments.priceCents,
  notes: appointments.notes,
  source: appointments.source,
  isDemo: appointments.isDemo,
  createdAt: appointments.createdAt,
  customerId: customers.id,
  firstName: customers.firstName,
  lastName: customers.lastName,
  phone: customers.phone,
  email: customers.email,
};

export type AppointmentListItem = Awaited<ReturnType<typeof listAppointments>>["items"][number];

export interface AppointmentFilter {
  status?: AppointmentStatus;
  q?: string;
  scope?: "upcoming" | "past" | "all";
  page?: number;
  pageSize?: number;
}

export async function listAppointments(filter: AppointmentFilter = {}, db: DbOrTx = getDb()) {
  const today = zonedNow().date;
  const conditions: SQL[] = [];
  if (filter.status) conditions.push(eq(appointments.status, filter.status));
  if (filter.scope === "upcoming") conditions.push(gte(appointments.date, today));
  if (filter.scope === "past") conditions.push(lt(appointments.date, today));
  const q = filter.q?.trim();
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    conditions.push(
      or(
        ilike(sql`${customers.firstName} || ' ' || ${customers.lastName}`, like),
        ilike(customers.email, like),
        ilike(customers.phone, `%${q.replace(/[^\d+]/g, "") || q}%`),
        ilike(appointments.serviceName, like),
      )!,
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const pageSize = filter.pageSize ?? 25;
  const page = Math.max(1, filter.page ?? 1);
  const order =
    filter.scope === "past"
      ? [desc(appointments.date), desc(appointments.startTime)]
      : [asc(appointments.date), asc(appointments.startTime)];

  const [items, [{ total }]] = await Promise.all([
    db
      .select(listColumns)
      .from(appointments)
      .innerJoin(customers, eq(customers.id, appointments.customerId))
      .where(where)
      .orderBy(...order)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: count() })
      .from(appointments)
      .innerJoin(customers, eq(customers.id, appointments.customerId))
      .where(where),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function countByStatus(db: DbOrTx = getDb()) {
  const today = zonedNow().date;
  const rows = await db
    .select({ status: appointments.status, total: count() })
    .from(appointments)
    .where(or(gte(appointments.date, today), ne(appointments.status, "PENDING")))
    .groupBy(appointments.status);
  const result: Record<AppointmentStatus, number> = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    CANCELLED: 0,
    COMPLETED: 0,
  };
  for (const row of rows) result[row.status] = row.total;
  return result;
}

/** Open requests that still need a decision (oldest first). */
export async function listPendingRequests(limit = 20, db: DbOrTx = getDb()) {
  return db
    .select(listColumns)
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .where(and(eq(appointments.status, "PENDING"), gte(appointments.date, zonedNow().date)))
    .orderBy(asc(appointments.date), asc(appointments.startTime))
    .limit(limit);
}

export async function listAppointmentsInRange(
  from: IsoDate,
  to: IsoDate,
  opts: { barberId?: string; statuses?: AppointmentStatus[] } = {},
  db: DbOrTx = getDb(),
) {
  return db
    .select(listColumns)
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .where(
      and(
        gte(appointments.date, from),
        lte(appointments.date, to),
        opts.barberId ? eq(appointments.barberId, opts.barberId) : undefined,
        opts.statuses ? inArray(appointments.status, opts.statuses) : undefined,
      ),
    )
    .orderBy(asc(appointments.date), asc(appointments.startTime));
}

export async function getAppointmentDetail(id: string, db: DbOrTx = getDb()) {
  const [row] = await db
    .select({ appointment: appointments, customer: customers })
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .where(eq(appointments.id, id));
  if (!row) return null;
  const [events, emails] = await Promise.all([
    db
      .select({
        id: appointmentEvents.id,
        type: appointmentEvents.type,
        actor: appointmentEvents.actor,
        message: appointmentEvents.message,
        createdAt: appointmentEvents.createdAt,
        userName: adminUsers.name,
      })
      .from(appointmentEvents)
      .leftJoin(adminUsers, eq(adminUsers.id, appointmentEvents.actorUserId))
      .where(eq(appointmentEvents.appointmentId, id))
      .orderBy(desc(appointmentEvents.createdAt)),
    db.select().from(emailLog).where(eq(emailLog.appointmentId, id)).orderBy(desc(emailLog.createdAt)),
  ]);
  return { ...row, events, emails };
}

export type AppointmentDetail = NonNullable<Awaited<ReturnType<typeof getAppointmentDetail>>>;

// ---------------------------------------------------------------------------
// Statuswijzigingen
// ---------------------------------------------------------------------------

export const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["COMPLETED", "CANCELLED"],
  REJECTED: ["APPROVED"],
  CANCELLED: ["APPROVED"],
  COMPLETED: ["APPROVED"],
};

const EVENT_FOR_STATUS: Record<AppointmentStatus, EventType> = {
  PENDING: "UPDATED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
};

export async function changeStatus(
  id: string,
  to: AppointmentStatus,
  opts: { userId: string | null; reason?: string | null; actor?: "ADMIN" | "SYSTEM" },
  db: Database = getDb(),
) {
  try {
    return await db.transaction(async (tx) => {
      await lockBookings(tx);
      const [current] = await tx.select().from(appointments).where(eq(appointments.id, id)).for("update");
      if (!current) throw new DomainError("Afspraak niet gevonden.", "NOT_FOUND");
      if (!STATUS_TRANSITIONS[current.status].includes(to)) {
        throw new DomainError("Deze statuswijziging is niet mogelijk.", "NOT_ALLOWED");
      }
      if (to === "APPROVED" && !isActiveStatus(current.status)) {
        await assertNoConflict(tx, {
          barberId: current.barberId,
          date: current.date,
          start: timeToMinutes(current.startTime),
          end: timeToMinutes(current.endTime),
          excludeId: current.id,
        });
      }
      const [updated] = await tx
        .update(appointments)
        .set({
          status: to,
          statusChangedAt: new Date(),
          statusReason: opts.reason ?? null,
          cancelledBy: to === "CANCELLED" ? (opts.actor ?? "ADMIN") : null,
        })
        .where(eq(appointments.id, id))
        .returning();
      await logEvent(tx, {
        appointmentId: id,
        type: to === "APPROVED" && current.status !== "PENDING" ? "REOPENED" : EVENT_FOR_STATUS[to],
        actor: opts.actor ?? "ADMIN",
        actorUserId: opts.userId,
        message: opts.reason,
      });
      return { previous: current, appointment: updated };
    });
  } catch (error) {
    if (isOverlapViolation(error)) {
      throw new DomainError("Dit tijdslot is inmiddels door een andere afspraak bezet.", "SLOT_TAKEN");
    }
    throw error;
  }
}

export async function deleteAppointment(id: string, db: DbOrTx = getDb()) {
  const deleted = await db.delete(appointments).where(eq(appointments.id, id)).returning({ id: appointments.id });
  if (!deleted.length) throw new DomainError("Afspraak niet gevonden.", "NOT_FOUND");
}

// ---------------------------------------------------------------------------
// Aanmaken & bewerken door beheerder
// ---------------------------------------------------------------------------

async function assertNoConflict(
  tx: DbOrTx,
  slot: { barberId: string | null; date: IsoDate; start: number; end: number; excludeId?: string },
) {
  if (!slot.barberId) return;
  const [conflict] = await tx
    .select({
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      firstName: customers.firstName,
      lastName: customers.lastName,
    })
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .where(
      and(
        eq(appointments.barberId, slot.barberId),
        eq(appointments.date, slot.date),
        inArray(appointments.status, ["PENDING", "APPROVED"]),
        lt(appointments.startTime, minutesToTime(slot.end)),
        sql`${appointments.endTime} > ${minutesToTime(slot.start)}::time`,
        slot.excludeId ? ne(appointments.id, slot.excludeId) : undefined,
      ),
    )
    .limit(1);
  if (conflict) {
    throw new DomainError(
      `Overlapt met de afspraak van ${conflict.firstName} ${conflict.lastName} (${conflict.startTime.slice(0, 5)} – ${conflict.endTime.slice(0, 5)}).`,
      "SLOT_TAKEN",
    );
  }
}

export interface AdminAppointmentInput {
  serviceId: string;
  barberId: string;
  date: IsoDate;
  startTime: string;
  durationMinutes: number;
  priceCents: number;
  notes: string | null;
  adminNotes: string | null;
}

async function resolveNames(tx: DbOrTx, serviceId: string, barberId: string) {
  const [[service], [barber]] = await Promise.all([
    tx.select().from(services).where(eq(services.id, serviceId)),
    tx.select().from(barbers).where(eq(barbers.id, barberId)),
  ]);
  if (!service) throw new DomainError("Kies een behandeling.");
  if (!barber) throw new DomainError("Kies een barber.");
  return { service, barber };
}

function endOf(startTime: string, durationMinutes: number) {
  const start = timeToMinutes(startTime);
  const end = start + durationMinutes;
  if (end > 24 * 60) throw new DomainError("De afspraak moet op dezelfde dag eindigen.");
  return { start, end };
}

export async function updateAppointment(
  id: string,
  input: AdminAppointmentInput,
  userId: string,
  db: Database = getDb(),
) {
  try {
    return await db.transaction(async (tx) => {
      await lockBookings(tx);
      const [current] = await tx.select().from(appointments).where(eq(appointments.id, id)).for("update");
      if (!current) throw new DomainError("Afspraak niet gevonden.", "NOT_FOUND");
      const { service, barber } = await resolveNames(tx, input.serviceId, input.barberId);
      const { start, end } = endOf(input.startTime, input.durationMinutes);
      if (isActiveStatus(current.status)) {
        await assertNoConflict(tx, { barberId: barber.id, date: input.date, start, end, excludeId: id });
      }
      const [updated] = await tx
        .update(appointments)
        .set({
          serviceId: service.id,
          serviceName: service.name,
          barberId: barber.id,
          barberName: barber.name,
          date: input.date,
          startTime: minutesToTime(start),
          endTime: minutesToTime(end),
          durationMinutes: input.durationMinutes,
          priceCents: input.priceCents,
          notes: input.notes,
          adminNotes: input.adminNotes,
        })
        .where(eq(appointments.id, id))
        .returning();

      const moved =
        current.date !== updated.date ||
        current.startTime !== updated.startTime ||
        current.barberId !== updated.barberId;
      if (moved) await tx.update(appointments).set({ reminderSentAt: null }).where(eq(appointments.id, id));
      await logEvent(tx, {
        appointmentId: id,
        type: "UPDATED",
        actor: "ADMIN",
        actorUserId: userId,
        message: moved
          ? `Verplaatst naar ${updated.date} ${updated.startTime.slice(0, 5)} (${barber.name})`
          : "Gegevens aangepast",
      });
      return { previous: current, appointment: updated, moved };
    });
  } catch (error) {
    if (isOverlapViolation(error)) {
      throw new DomainError("Dit tijdslot overlapt met een andere afspraak.", "SLOT_TAKEN");
    }
    throw error;
  }
}

export interface AdminCustomerInput {
  customerId: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}

export async function createAppointmentByAdmin(
  input: AdminAppointmentInput & { customer: AdminCustomerInput; status: "APPROVED" | "PENDING" },
  userId: string,
  db: Database = getDb(),
) {
  try {
    return await db.transaction(async (tx) => {
      await lockBookings(tx);
      const { service, barber } = await resolveNames(tx, input.serviceId, input.barberId);
      const { start, end } = endOf(input.startTime, input.durationMinutes);
      await assertNoConflict(tx, { barberId: barber.id, date: input.date, start, end });

      const customerId = await upsertCustomerForAdmin(tx, input.customer);
      const [appointment] = await tx
        .insert(appointments)
        .values({
          customerId,
          barberId: barber.id,
          barberName: barber.name,
          serviceId: service.id,
          serviceName: service.name,
          priceCents: input.priceCents,
          durationMinutes: input.durationMinutes,
          date: input.date,
          startTime: minutesToTime(start),
          endTime: minutesToTime(end),
          status: input.status,
          notes: input.notes,
          adminNotes: input.adminNotes,
          source: "ADMIN",
          statusChangedAt: new Date(),
        })
        .returning();
      await logEvent(tx, {
        appointmentId: appointment.id,
        type: "CREATED",
        actor: "ADMIN",
        actorUserId: userId,
        message: "Ingepland via het beheer",
      });
      return appointment;
    });
  } catch (error) {
    if (isOverlapViolation(error)) {
      throw new DomainError("Dit tijdslot overlapt met een andere afspraak.", "SLOT_TAKEN");
    }
    throw error;
  }
}

async function upsertCustomerForAdmin(tx: DbOrTx, input: AdminCustomerInput): Promise<string> {
  if (input.customerId) {
    const [existing] = await tx.select({ id: customers.id }).from(customers).where(eq(customers.id, input.customerId));
    if (!existing) throw new DomainError("Klant niet gevonden.", "NOT_FOUND");
    return existing.id;
  }
  if (input.email) {
    const [byEmail] = await tx.select({ id: customers.id }).from(customers).where(eq(customers.email, input.email));
    if (byEmail) {
      await tx
        .update(customers)
        .set({ firstName: input.firstName, lastName: input.lastName, phone: input.phone })
        .where(eq(customers.id, byEmail.id));
      return byEmail.id;
    }
  }
  const [created] = await tx
    .insert(customers)
    .values({
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email,
    })
    .returning({ id: customers.id });
  return created.id;
}
