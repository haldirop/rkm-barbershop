"use server";

import { after } from "next/server";
import { z } from "zod";
import { formatDateLong } from "@/lib/format";
import { isoDateSchema, timeSchema } from "@/lib/validation";
import { clientIp, isRateLimited, recordHit } from "@/server/auth/rate-limit";
import { notifyCustomerCancelled, notifyRescheduleRequested } from "@/server/notifications/notify";
import { cancelByCustomer, rescheduleByCustomer } from "@/server/services/booking";
import { DomainError } from "@/server/services/shared";

export type ManageResult = { ok: true } | { ok: false; error: string; slotTaken?: boolean };

const tokenSchema = z.string().min(10).max(120);

async function guard(): Promise<string | null> {
  const key = `manage:${await clientIp()}`;
  if (await isRateLimited(key, 20, 15)) return "Te veel pogingen. Probeer het over een paar minuten opnieuw.";
  await recordHit(key);
  return null;
}

function failure(error: unknown): ManageResult {
  if (error instanceof DomainError) return { ok: false, error: error.message, slotTaken: error.code === "SLOT_TAKEN" };
  console.error("[afspraak beheren] Onverwachte fout:", error);
  return { ok: false, error: "Er ging iets mis. Probeer het opnieuw of bel ons even." };
}

export async function cancelAppointment(token: string): Promise<ManageResult> {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return { ok: false, error: "Deze link is ongeldig." };
  const limited = await guard();
  if (limited) return { ok: false, error: limited };
  try {
    const { appointment } = await cancelByCustomer(parsed.data);
    after(() => notifyCustomerCancelled(appointment.id));
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function rescheduleAppointment(token: string, date: string, time: string): Promise<ManageResult> {
  const parsed = z
    .object({ token: tokenSchema, date: isoDateSchema, time: timeSchema })
    .safeParse({ token, date, time });
  if (!parsed.success) return { ok: false, error: "Kies een geldige datum en tijd." };
  const limited = await guard();
  if (limited) return { ok: false, error: limited };
  try {
    const { previous, appointment } = await rescheduleByCustomer(parsed.data.token, {
      date: parsed.data.date,
      startTime: parsed.data.time,
    });
    const change = `Oorspronkelijk: ${formatDateLong(previous.date)} om ${previous.startTime.slice(0, 5)}.`;
    after(() => notifyRescheduleRequested(appointment.id, change));
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
