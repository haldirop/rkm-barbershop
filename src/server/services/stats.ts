import "server-only";
import { and, count, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { endOfMonth, startOfMonth, zonedNow } from "@/lib/time";
import { getDb, type DbOrTx } from "@/server/db/client";
import { appointments } from "@/server/db/schema";
import { freeMinutesOnDate } from "./availability";

const BOOKED = ["APPROVED", "COMPLETED"] as const;

export async function getDashboardStats(db: DbOrTx = getDb()) {
  const today = zonedNow().date;
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const [todayRows, pending, approvedUpcoming, freeMinutes, popular] =
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
    freeMinutesToday: freeMinutes,
    popularServices: popular,
  };
}
