import "server-only";
import { and, asc, count, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { zonedNow, type IsoDate } from "@/lib/time";
import { createAdminLogin, removeAdminLogin, setLocalPassword } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import {
  appointments,
  barberWorkingHours,
  barbers,
  blockedTimes,
  breaks,
  businessHours,
  reviews,
  services,
  settings,
  adminUsers,
} from "@/server/db/schema";
import { DomainError } from "./shared";

async function openAppointments(column: typeof appointments.serviceId | typeof appointments.barberId, id: string) {
  const [{ total }] = await getDb()
    .select({ total: count() })
    .from(appointments)
    .where(
      and(
        eq(column, id),
        inArray(appointments.status, ["PENDING", "APPROVED"]),
        gte(appointments.date, zonedNow().date),
      ),
    );
  return total;
}

// ---------------------------------------------------------------------------
// Diensten
// ---------------------------------------------------------------------------

export interface ServiceInput {
  name: string;
  description: string | null;
  priceCents: number;
  durationMinutes: number;
  isActive: boolean;
  sortOrder: number;
}

export async function saveService(id: string | null, input: ServiceInput) {
  const db = getDb();
  if (id) {
    const [row] = await db.update(services).set(input).where(eq(services.id, id)).returning();
    if (!row) throw new DomainError("Dienst niet gevonden.", "NOT_FOUND");
    return row;
  }
  const [row] = await db.insert(services).values(input).returning();
  return row;
}

/** Existing appointments keep their own copy of name, price and duration. */
export async function deleteService(id: string) {
  const open = await openAppointments(appointments.serviceId, id);
  if (open > 0) {
    throw new DomainError(
      `Er staan nog ${open} komende afspraken voor deze dienst. Zet de dienst op ‘niet online boekbaar’ of verplaats die afspraken eerst.`,
      "NOT_ALLOWED",
    );
  }
  await getDb().delete(services).where(eq(services.id, id));
}

// ---------------------------------------------------------------------------
// Barbers
// ---------------------------------------------------------------------------

export interface BarberInput {
  name: string;
  bio: string | null;
  isActive: boolean;
  sortOrder: number;
  hours: Array<{ weekday: number; isWorking: boolean; startTime: string; endTime: string }>;
}

export async function saveBarber(id: string | null, input: BarberInput) {
  const { hours, ...fields } = input;
  return getDb().transaction(async (tx) => {
    let barberId = id;
    if (barberId) {
      const [row] = await tx.update(barbers).set(fields).where(eq(barbers.id, barberId)).returning();
      if (!row) throw new DomainError("Barber niet gevonden.", "NOT_FOUND");
    } else {
      const [row] = await tx.insert(barbers).values(fields).returning();
      barberId = row.id;
    }
    await tx.delete(barberWorkingHours).where(eq(barberWorkingHours.barberId, barberId));
    await tx.insert(barberWorkingHours).values(hours.map((h) => ({ ...h, barberId: barberId! })));
    return barberId;
  });
}

export async function deleteBarber(id: string) {
  const open = await openAppointments(appointments.barberId, id);
  if (open > 0) {
    throw new DomainError(
      `Deze barber heeft nog ${open} komende afspraken. Zet de barber op inactief of verplaats die afspraken eerst.`,
      "NOT_ALLOWED",
    );
  }
  await getDb().delete(barbers).where(eq(barbers.id, id));
}

// ---------------------------------------------------------------------------
// Openingstijden, pauzes en blokkades
// ---------------------------------------------------------------------------

export async function saveBusinessHours(
  days: Array<{ weekday: number; isOpen: boolean; openTime: string; closeTime: string }>,
) {
  await getDb().transaction(async (tx) => {
    for (const day of days) {
      await tx
        .insert(businessHours)
        .values(day)
        .onConflictDoUpdate({
          target: businessHours.weekday,
          set: { isOpen: day.isOpen, openTime: day.openTime, closeTime: day.closeTime },
        });
    }
  });
}

export async function addBreaks(input: {
  weekdays: number[];
  startTime: string;
  endTime: string;
  label: string | null;
  barberId: string | null;
}) {
  await getDb()
    .insert(breaks)
    .values(
      input.weekdays.map((weekday) => ({
        weekday,
        startTime: input.startTime,
        endTime: input.endTime,
        label: input.label,
        barberId: input.barberId,
      })),
    );
}

export async function deleteBreak(id: string) {
  await getDb().delete(breaks).where(eq(breaks.id, id));
}

export async function addBlock(input: {
  startDate: IsoDate;
  endDate: IsoDate;
  startTime: string | null;
  endTime: string | null;
  barberId: string | null;
  reason: string | null;
}) {
  const db = getDb();
  await db.insert(blockedTimes).values(input);
  // Report existing appointments in the blocked period, so the owner can contact those customers.
  const [{ affected }] = await db
    .select({ affected: count() })
    .from(appointments)
    .where(
      and(
        gte(appointments.date, input.startDate),
        lte(appointments.date, input.endDate),
        inArray(appointments.status, ["PENDING", "APPROVED"]),
        input.barberId ? eq(appointments.barberId, input.barberId) : undefined,
        input.startTime && input.endTime
          ? and(
              sql`${appointments.startTime} < ${input.endTime}::time`,
              sql`${appointments.endTime} > ${input.startTime}::time`,
            )
          : undefined,
      ),
    );
  return { affected };
}

export async function deleteBlock(id: string) {
  await getDb().delete(blockedTimes).where(eq(blockedTimes.id, id));
}

export async function listUpcomingBlocks() {
  const db = getDb();
  return db
    .select({
      id: blockedTimes.id,
      startDate: blockedTimes.startDate,
      endDate: blockedTimes.endDate,
      startTime: blockedTimes.startTime,
      endTime: blockedTimes.endTime,
      reason: blockedTimes.reason,
      barberName: barbers.name,
    })
    .from(blockedTimes)
    .leftJoin(barbers, eq(barbers.id, blockedTimes.barberId))
    .where(gte(blockedTimes.endDate, zonedNow().date))
    .orderBy(asc(blockedTimes.startDate), asc(blockedTimes.startTime));
}

export async function listBreaksWithBarber() {
  return getDb()
    .select({
      id: breaks.id,
      weekday: breaks.weekday,
      startTime: breaks.startTime,
      endTime: breaks.endTime,
      label: breaks.label,
      barberName: barbers.name,
    })
    .from(breaks)
    .leftJoin(barbers, eq(barbers.id, breaks.barberId))
    .orderBy(asc(breaks.weekday), asc(breaks.startTime));
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export async function listReviews() {
  return getDb().select().from(reviews).orderBy(asc(reviews.sortOrder), asc(reviews.createdAt));
}

export async function saveReview(
  id: string | null,
  input: { authorName: string; rating: number; body: string; source: string | null; isPublished: boolean; sortOrder: number },
) {
  const db = getDb();
  if (id) {
    // Editing a demo review turns it into the owner's own content.
    await db.update(reviews).set({ ...input, isDemo: false }).where(eq(reviews.id, id));
  } else {
    await db.insert(reviews).values(input);
  }
}

export async function deleteReview(id: string) {
  await getDb().delete(reviews).where(eq(reviews.id, id));
}

// ---------------------------------------------------------------------------
// Instellingen & beheerders
// ---------------------------------------------------------------------------

export type SettingsInput = Omit<typeof settings.$inferInsert, "id" | "updatedAt" | "detailsConfirmedAt">;

export async function saveSettings(input: Partial<SettingsInput>, confirmDetails: boolean) {
  await getDb()
    .update(settings)
    .set({ ...input, ...(confirmDetails ? { detailsConfirmedAt: new Date() } : {}) })
    .where(eq(settings.id, 1));
}

export async function listUsers() {
  return getDb()
    .select({
      id: adminUsers.id,
      name: adminUsers.name,
      email: adminUsers.email,
      role: adminUsers.role,
      lastLoginAt: adminUsers.lastLoginAt,
      /** False until an invited administrator has logged in for the first time. */
      linked: sql<boolean>`${adminUsers.authUserId} IS NOT NULL OR ${adminUsers.passwordHash} IS NOT NULL`,
    })
    .from(adminUsers)
    .orderBy(asc(adminUsers.createdAt));
}

/** Adds an administrator: a login (Supabase Auth in production) plus a row on the allowlist. */
export async function createUser(input: { name: string; email: string; password: string }) {
  const db = getDb();
  const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, input.email));
  if (existing) throw new DomainError("Er bestaat al een beheerder met dit e-mailadres.");
  const authUserId = await createAdminLogin(input);
  const [row] = await db
    .insert(adminUsers)
    .values({ name: input.name, email: input.email, role: "ADMIN", authUserId })
    .returning();
  await setLocalPassword(row.id, input.password);
}

export async function deleteUser(id: string, currentUserId: string) {
  if (id === currentUserId) throw new DomainError("Je kunt je eigen account niet verwijderen.", "NOT_ALLOWED");
  const db = getDb();
  const [target] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
  if (!target) throw new DomainError("Beheerder niet gevonden.", "NOT_FOUND");
  if (target.role === "OWNER") throw new DomainError("Het eigenaarsaccount kan niet worden verwijderd.", "NOT_ALLOWED");
  const [{ others }] = await db.select({ others: count() }).from(adminUsers).where(ne(adminUsers.id, id));
  if (others === 0) throw new DomainError("Er moet minimaal één beheerder overblijven.", "NOT_ALLOWED");
  await removeAdminLogin(target);
  await db.delete(adminUsers).where(eq(adminUsers.id, id));
}
