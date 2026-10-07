import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { addDays, minutesToTime, timeToMinutes, zonedNow, type ZonedNow } from "@/lib/time";
import { getDb, type Database } from "@/server/db/client";
import { appointments } from "@/server/db/schema";
import { sendReminder } from "@/server/notifications/notify";
import { loadSettings } from "./settings";
import { logEvent } from "./shared";

function localTimestamp(date: string, minutes: number) {
  const days = Math.floor(minutes / 1440);
  return `${addDays(date, days)} ${minutesToTime(((minutes % 1440) + 1440) % 1440)}`;
}

/**
 * Daily housekeeping, triggered by /api/cron/herinneringen:
 * 1. "Herinnering: morgen heb je een afspraak" for every confirmed appointment of
 *    tomorrow — sent once, from the configured time (default 17:00). Works with a
 *    single daily run (Vercel Hobby) as well as with hourly runs.
 * 2. Confirmed appointments that ended more than 2 hours ago are marked as completed.
 */
export async function runScheduledJobs(
  opts: { now?: ZonedNow; send?: (appointmentId: string) => Promise<boolean> } = {},
  db: Database = getDb(),
) {
  const now = opts.now ?? zonedNow();
  const send = opts.send ?? sendReminder;
  const settings = await loadSettings(db);

  let reminders = 0;
  if (settings.remindersEnabled && now.minutes >= timeToMinutes(settings.reminderSendTime)) {
    const due = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, "APPROVED"),
          isNull(appointments.reminderSentAt),
          eq(appointments.date, addDays(now.date, 1)),
        ),
      );
    for (const { id } of due) {
      // Claim first, so a slow mail server can never cause a double reminder on the next run.
      const [claimed] = await db
        .update(appointments)
        .set({ reminderSentAt: new Date() })
        .where(and(eq(appointments.id, id), isNull(appointments.reminderSentAt)))
        .returning({ id: appointments.id });
      if (claimed && (await send(id))) reminders++;
    }
  }

  const finishedBefore = localTimestamp(now.date, now.minutes - 120);
  const completed = await db.transaction(async (tx) => {
    const rows = await tx
      .update(appointments)
      .set({ status: "COMPLETED", statusChangedAt: new Date() })
      .where(
        and(
          eq(appointments.status, "APPROVED"),
          sql`(${appointments.date} + ${appointments.endTime}) < ${finishedBefore}::timestamp`,
        ),
      )
      .returning({ id: appointments.id });
    for (const row of rows) {
      await logEvent(tx, { appointmentId: row.id, type: "COMPLETED", actor: "SYSTEM", message: "Automatisch afgerond" });
    }
    return rows.length;
  });

  return { reminders, completed };
}
