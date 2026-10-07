"use server";

import { z } from "zod";
import { isoDateSchema, uuidSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/auth/session";
import { listAppointmentsInRange } from "@/server/services/appointments";
import { searchCustomers } from "@/server/services/customers";

export async function findCustomers(q: string) {
  await requireAdmin();
  const parsed = z.string().trim().min(2).max(60).safeParse(q);
  if (!parsed.success) return [];
  return searchCustomers(parsed.data);
}

/** What is already planned for a barber on a day (for the appointment form). */
export async function barberDay(barberId: string, date: string, excludeId?: string) {
  await requireAdmin();
  const parsed = z.object({ barberId: uuidSchema, date: isoDateSchema }).safeParse({ barberId, date });
  if (!parsed.success) return [];
  const rows = await listAppointmentsInRange(parsed.data.date, parsed.data.date, {
    barberId: parsed.data.barberId,
    statuses: ["PENDING", "APPROVED"],
  });
  return rows
    .filter((r) => r.id !== excludeId)
    .map((r) => ({
      id: r.id,
      start: r.startTime.slice(0, 5),
      end: r.endTime.slice(0, 5),
      name: `${r.firstName} ${r.lastName}`,
      service: r.serviceName,
      status: r.status,
    }));
}
