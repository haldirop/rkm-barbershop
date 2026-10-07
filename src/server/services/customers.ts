import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, max, ne, or, sql } from "drizzle-orm";
import { zonedNow } from "@/lib/time";
import { getDb, type DbOrTx } from "@/server/db/client";
import { appointments, barbers, customers } from "@/server/db/schema";
import { DomainError } from "./shared";

export async function listCustomers(opts: { q?: string; page?: number; pageSize?: number } = {}, db: DbOrTx = getDb()) {
  const pageSize = opts.pageSize ?? 30;
  const page = Math.max(1, opts.page ?? 1);
  const q = opts.q?.trim();
  const like = q ? `%${q.replace(/[%_\\]/g, "\\$&")}%` : null;
  const where = like
    ? or(
        ilike(sql`${customers.firstName} || ' ' || ${customers.lastName}`, like),
        ilike(customers.email, like),
        ilike(customers.phone, `%${q!.replace(/[^\d+]/g, "") || q}%`),
      )
    : undefined;

  const today = zonedNow().date;
  const stats = db
    .select({
      customerId: appointments.customerId,
      total: count().as("total"),
      lastVisit: max(sql`CASE WHEN ${appointments.date} < ${today} AND ${appointments.status} IN ('APPROVED','COMPLETED') THEN ${appointments.date} END`).as("last_visit"),
      nextVisit: sql<string | null>`MIN(CASE WHEN ${appointments.date} >= ${today} AND ${appointments.status} IN ('PENDING','APPROVED') THEN ${appointments.date} END)`.as("next_visit"),
    })
    .from(appointments)
    .groupBy(appointments.customerId)
    .as("stats");

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phone: customers.phone,
        isDemo: customers.isDemo,
        createdAt: customers.createdAt,
        appointmentCount: sql<number>`COALESCE(${stats.total}, 0)`.mapWith(Number),
        lastVisit: sql<string | null>`${stats.lastVisit}`,
        nextVisit: stats.nextVisit,
      })
      .from(customers)
      .leftJoin(stats, eq(stats.customerId, customers.id))
      .where(where)
      .orderBy(asc(customers.lastName), asc(customers.firstName))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(customers).where(where),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getCustomerDetail(id: string, db: DbOrTx = getDb()) {
  const [customer] = await db
    .select({ customer: customers, preferredBarberName: barbers.name })
    .from(customers)
    .leftJoin(barbers, eq(barbers.id, customers.preferredBarberId))
    .where(eq(customers.id, id));
  if (!customer) return null;
  const history = await db
    .select()
    .from(appointments)
    .where(eq(appointments.customerId, id))
    .orderBy(desc(appointments.date), desc(appointments.startTime));
  const completedOrApproved = history.filter((a) => a.status === "COMPLETED" || a.status === "APPROVED");
  return {
    ...customer.customer,
    preferredBarberName: customer.preferredBarberName,
    history,
    totalSpentCents: history
      .filter((a) => a.status === "COMPLETED")
      .reduce((sum, a) => sum + a.priceCents, 0),
    visits: completedOrApproved.length,
  };
}

export async function searchCustomers(q: string, db: DbOrTx = getDb()) {
  const like = `%${q.trim().replace(/[%_\\]/g, "\\$&")}%`;
  return db
    .select({
      id: customers.id,
      firstName: customers.firstName,
      lastName: customers.lastName,
      phone: customers.phone,
      email: customers.email,
    })
    .from(customers)
    .where(
      or(
        ilike(sql`${customers.firstName} || ' ' || ${customers.lastName}`, like),
        ilike(customers.phone, like),
        ilike(customers.email, like),
      ),
    )
    .orderBy(asc(customers.lastName))
    .limit(8);
}

export async function updateCustomer(
  id: string,
  input: { firstName: string; lastName: string; phone: string; email: string | null; adminNotes: string | null },
  db: DbOrTx = getDb(),
) {
  if (input.email) {
    const [taken] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.email, input.email), ne(customers.id, id)));
    if (taken) throw new DomainError("Er is al een andere klant met dit e-mailadres.");
  }
  const [updated] = await db.update(customers).set(input).where(eq(customers.id, id)).returning();
  if (!updated) throw new DomainError("Klant niet gevonden.", "NOT_FOUND");
  return updated;
}

/** AVG: removes the customer and all of their appointments permanently. */
export async function deleteCustomer(id: string, db: DbOrTx = getDb()) {
  const [open] = await db
    .select({ total: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.customerId, id),
        inArray(appointments.status, ["PENDING", "APPROVED"]),
        sql`${appointments.date} >= ${zonedNow().date}`,
      ),
    );
  if (open.total > 0) {
    throw new DomainError(
      "Deze klant heeft nog openstaande afspraken. Annuleer of verwijder die eerst.",
      "NOT_ALLOWED",
    );
  }
  await db.delete(customers).where(eq(customers.id, id));
}
