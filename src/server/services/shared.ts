import { sql } from "drizzle-orm";
import type { DbOrTx } from "@/server/db/client";
import { appointmentEvents } from "@/server/db/schema";

/** An error whose message is safe and meant to be shown to the user. */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: "SLOT_TAKEN" | "NOT_FOUND" | "INVALID" | "LIMIT" | "NOT_ALLOWED" = "INVALID",
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const SLOT_TAKEN_MESSAGE =
  "Dit tijdstip is zojuist bezet geraakt. Kies alsjeblieft een ander moment.";

/** True when Postgres rejected an overlapping appointment (exclusion constraint). */
export function isOverlapViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    if (typeof current === "object" && "code" in current && current.code === "23P01") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * Serialises all booking mutations. A barbershop has few concurrent writes, so one
 * transaction-scoped advisory lock is simple and makes check-then-insert race free.
 */
export async function lockBookings(tx: DbOrTx) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(7203001)`);
}

export type EventType =
  | "CREATED"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED"
  | "RESCHEDULED"
  | "UPDATED"
  | "REOPENED";

export async function logEvent(
  db: DbOrTx,
  event: {
    appointmentId: string;
    type: EventType;
    actor: "CUSTOMER" | "ADMIN" | "SYSTEM";
    actorUserId?: string | null;
    message?: string | null;
  },
) {
  await db.insert(appointmentEvents).values({
    appointmentId: event.appointmentId,
    type: event.type,
    actor: event.actor,
    actorUserId: event.actorUserId ?? null,
    message: event.message ?? null,
  });
}
