import "server-only";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { cache } from "react";
import { getDb, type DbOrTx } from "@/server/db/client";
import {
  barberWorkingHours,
  barbers,
  blockedTimes,
  breaks,
  businessHours,
  services,
} from "@/server/db/schema";
import type { IsoDate } from "@/lib/time";

export async function listServices(opts: { activeOnly?: boolean } = {}, db: DbOrTx = getDb()) {
  return db
    .select()
    .from(services)
    .where(opts.activeOnly ? eq(services.isActive, true) : undefined)
    .orderBy(asc(services.sortOrder), asc(services.name));
}

export const getActiveServices = cache(() => listServices({ activeOnly: true }));

export async function getService(id: string, db: DbOrTx = getDb()) {
  const [row] = await db.select().from(services).where(eq(services.id, id));
  return row ?? null;
}

export type BarberWithHours = Awaited<ReturnType<typeof listBarbers>>[number];

export async function listBarbers(opts: { activeOnly?: boolean } = {}, db: DbOrTx = getDb()) {
  const rows = await db
    .select()
    .from(barbers)
    .where(opts.activeOnly ? eq(barbers.isActive, true) : undefined)
    .orderBy(asc(barbers.sortOrder), asc(barbers.name));
  const hours = await db.select().from(barberWorkingHours);
  return rows.map((barber) => ({
    ...barber,
    hours: hours
      .filter((h) => h.barberId === barber.id)
      .sort((a, b) => a.weekday - b.weekday),
  }));
}

export const getActiveBarbers = cache(() => listBarbers({ activeOnly: true }));

export async function getBarber(id: string, db: DbOrTx = getDb()) {
  const [row] = await db.select().from(barbers).where(eq(barbers.id, id));
  return row ?? null;
}

export async function listBusinessHours(db: DbOrTx = getDb()) {
  return db.select().from(businessHours).orderBy(asc(businessHours.weekday));
}

export const getBusinessHours = cache(() => listBusinessHours());

export async function listBreaks(db: DbOrTx = getDb()) {
  return db.select().from(breaks).orderBy(asc(breaks.weekday), asc(breaks.startTime));
}

/** Blocks that touch the given date range. */
export async function listBlockedTimes(from: IsoDate, to: IsoDate, db: DbOrTx = getDb()) {
  return db
    .select()
    .from(blockedTimes)
    .where(and(lte(blockedTimes.startDate, to), gte(blockedTimes.endDate, from)))
    .orderBy(asc(blockedTimes.startDate), asc(blockedTimes.startTime));
}
