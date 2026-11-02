"use server";

import { after } from "next/server";
import { z } from "zod";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { customerErrorText } from "@/i18n/errors";
import { booking } from "@/i18n/messages/booking";
import { formatDateLong } from "@/lib/format";
import { isoDateSchema, timeSchema } from "@/lib/validation";
import { clientIp, isRateLimited, recordHit } from "@/server/auth/rate-limit";
import { notifyCustomerCancelled, notifyRescheduleRequested } from "@/server/notifications/notify";
import { cancelByCustomer, rescheduleByCustomer } from "@/server/services/booking";
import { checkAvailabilityAlerts } from "@/server/services/waitlist";
import { DomainError } from "@/server/services/shared";

export type ManageResult = { ok: true } | { ok: false; error: string; slotTaken?: boolean };

const tokenSchema = z.string().min(10).max(120);

function asLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

async function guard(locale: Locale): Promise<string | null> {
  const key = `manage:${await clientIp()}`;
  if (await isRateLimited(key, 20, 15)) return booking[locale].errors.tooManyAttempts;
  await recordHit(key);
  return null;
}

function failure(error: unknown, locale: Locale): ManageResult {
  if (error instanceof DomainError) {
    return { ok: false, error: customerErrorText(error, locale), slotTaken: error.code === "SLOT_TAKEN" };
  }
  console.error("[afspraak beheren] Onverwachte fout:", error);
  return { ok: false, error: booking[locale].errors.unexpected };
}

export async function cancelAppointment(token: string, language?: unknown): Promise<ManageResult> {
  const locale = asLocale(language);
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return { ok: false, error: booking[locale].errors.invalidLink };
  const limited = await guard(locale);
  if (limited) return { ok: false, error: limited };
  try {
    const { appointment } = await cancelByCustomer(parsed.data);
    after(() => notifyCustomerCancelled(appointment.id));
    after(checkAvailabilityAlerts);
    return { ok: true };
  } catch (error) {
    return failure(error, locale);
  }
}

export async function rescheduleAppointment(
  token: string,
  date: string,
  time: string,
  language?: unknown,
): Promise<ManageResult> {
  const locale = asLocale(language);
  const parsed = z
    .object({ token: tokenSchema, date: isoDateSchema, time: timeSchema })
    .safeParse({ token, date, time });
  if (!parsed.success) return { ok: false, error: booking[locale].errors.chooseValid };
  const limited = await guard(locale);
  if (limited) return { ok: false, error: limited };
  try {
    const { previous, appointment } = await rescheduleByCustomer(parsed.data.token, {
      date: parsed.data.date,
      startTime: parsed.data.time,
    });
    // For the shop (Dutch): the original time, shown in their e-mail.
    const change = `Oorspronkelijk: ${formatDateLong(previous.date)} om ${previous.startTime.slice(0, 5)}.`;
    after(() => notifyRescheduleRequested(appointment.id, change));
    after(checkAvailabilityAlerts);
    return { ok: true };
  } catch (error) {
    return failure(error, locale);
  }
}
