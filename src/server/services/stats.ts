import "server-only";
import { and, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { addDays, endOfMonth, startOfMonth, startOfWeek, zonedNow } from "@/lib/time";
import { getDb, type DbOrTx } from "@/server/db/client";
import { appointments } from "@/server/db/schema";
import { freeMinutesOnDate } from "./availability";

const BOOKED = ["APPROVED", "COMPLETED"] as const;

export async function getDashboardStats(db: DbOrTx = getDb()) {
  const today = zonedNow().date;
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const revenueBetween = (from: string, to: string) =>
    db
      .select({ cents: sql<number>`COALESCE(SUM(${appointments.priceCents}), 0)`.mapWith(Number) })
      .from(appointments)
      .where(
        and(
          gte(appointments.date, from),
          lte(appointments.date, to),
          inArray(appointments.status, [...BOOKED]),
        ),
      )
      .then((rows) => rows[0].cents);

  const [todayRows, pending, approvedUpcoming, weekRevenue, monthRevenue, freeMinutes, popular] =
    await Promise.all([
      db
        .select({ status: appointments.status, total: count() })
        .from(appointments)
        .where(eq(appointments.date, today))
        .groupBy(appointments.status),
      db
        .select({ total: count() })
        .from(appointments)
        .where(and(eq(appointments.status, "PENDING"), gte(appointments.date, today)))
        .then((r) => r[0].total),
      db
        .select({ total: count() })
        .from(appointments)
        .where(and(eq(appointments.status, "APPROVED"), gte(appointments.date, today)))
        .then((r) => r[0].total),
      revenueBetween(weekStart, weekEnd),
      revenueBetween(monthStart, monthEnd),
      freeMinutesOnDate(today, db),
      db
        .select({ name: appointments.serviceName, total: count() })
        .from(appointments)
        .where(
          and(
            gte(appointments.date, monthStart),
            lte(appointments.date, monthEnd),
            inArray(appointments.status, [...BOOKED, "PENDING"]),
          ),
        )
        .groupBy(appointments.serviceName)
        .orderBy(desc(count()))
        .limit(4),
    ]);

  const todayBooked = todayRows
    .filter((r) => r.status === "APPROVED" || r.status === "COMPLETED")
    .reduce((s, r) => s + r.total, 0);
  const todayPending = todayRows.find((r) => r.status === "PENDING")?.total ?? 0;

  return {
    today,
    todayBooked,
    todayPending,
    pending,
    approvedUpcoming,
    weekRevenueCents: weekRevenue,
    monthRevenueCents: monthRevenue,
    freeMinutesToday: freeMinutes,
    popularServices: popular,
  };
}
