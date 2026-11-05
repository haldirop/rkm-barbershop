"use server";

import { after } from "next/server";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { customerErrorText } from "@/i18n/errors";
import { booking, localizeFieldErrors } from "@/i18n/messages/booking";
import { formatDateLong, formatPrice } from "@/lib/format";
import { availabilityAlertSchema, bookingRequestSchema, fieldErrors, type FieldErrors } from "@/lib/validation";
import { clientIp, isRateLimited, recordHit } from "@/server/auth/rate-limit";
import { notifyRequested } from "@/server/notifications/notify";
import { createBookingRequest } from "@/server/services/booking";
import { createAvailabilityAlert } from "@/server/services/waitlist";
import { DomainError } from "@/server/services/shared";

export type BookingResult =
  | {
      ok: true;
      token: string;
      summary: {
        serviceName: string;
        barberName: string;
        dateLabel: string;
        time: string;
        price: string;
        firstName: string;
        email: string;
        /** Everyone in the booking, in order (one entry for a single appointment). */
        people: Array<{ name: string | null; serviceId: string | null; serviceName: string; time: string; price: string }>;
      };
    }
  | { ok: false; error: string; fieldErrors?: FieldErrors; slotTaken?: boolean };

/** The language the request came from; anything unexpected is treated as Dutch. */
function asLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function requestAppointment(input: unknown, language?: unknown): Promise<BookingResult> {
  const locale = asLocale(language);
  const t = booking[locale].errors;
  const parsed = bookingRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t.checkFields, fieldErrors: localizeFieldErrors(fieldErrors(parsed.error), locale) };
  }
  const data = parsed.data;
  // Honeypot filled in: almost certainly a bot. Answer vaguely, store nothing.
  if (data.website) return { ok: false, error: t.generic };

  const ipKey = `booking:${await clientIp()}`;
  if (await isRateLimited(ipKey, 6, 30)) return { ok: false, error: t.tooManyRequests };
  await recordHit(ipKey);

  try {
    const { appointment, appointments: created, token } = await createBookingRequest({
      serviceId: data.serviceId,
      barberId: data.barberId,
      date: data.date,
      startTime: data.startTime,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
      name: data.name ?? null,
      companions: data.companions ?? [],
      locale,
    });
    // E-mails are sent after the response, so the customer isn't kept waiting.
    after(() => notifyRequested(appointment.id));
    const last = created.at(-1)!;
    return {
      ok: true,
      token,
      summary: {
        // The appointment keeps the Dutch name for the shop; the customer sees their own language.
        serviceName: appointment.serviceName,
        barberName: appointment.barberName,
        dateLabel: formatDateLong(appointment.date, false, locale),
        time: `${appointment.startTime.slice(0, 5)} – ${last.endTime.slice(0, 5)}`,
        price: formatPrice(created.reduce((sum, a) => sum + a.priceCents, 0), locale),
        firstName: data.firstName,
        email: data.email,
        people: created.map((a) => ({
          name: a.guestName,
          serviceId: a.serviceId,
          serviceName: a.serviceName,
          time: `${a.startTime.slice(0, 5)} – ${a.endTime.slice(0, 5)}`,
          price: formatPrice(a.priceCents, locale),
        })),
      },
    };
  } catch (error) {
    if (error instanceof DomainError) {
      return { ok: false, error: customerErrorText(error, locale), slotTaken: error.code === "SLOT_TAKEN" };
    }
    console.error("[boeking] Onverwachte fout:", error);
    return { ok: false, error: t.generic };
  }
}

export type AlertResult = { ok: true; message: string } | { ok: false; error: string; fieldErrors?: FieldErrors };

/** "Houd me op de hoogte": an e-mail as soon as a fully booked day has room again. */
export async function requestAvailabilityAlert(input: unknown, language?: unknown): Promise<AlertResult> {
  const locale = asLocale(language);
  const t = booking[locale];
  const parsed = availabilityAlertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t.errors.checkEmail, fieldErrors: localizeFieldErrors(fieldErrors(parsed.error), locale) };
  }
  const data = parsed.data;

  const ipKey = `alert:${await clientIp()}`;
  if (await isRateLimited(ipKey, 8, 30)) return { ok: false, error: t.errors.tooManyAlerts };
  await recordHit(ipKey);

  try {
    await createAvailabilityAlert({
      serviceId: data.serviceId,
      barberId: data.barberId,
      date: data.date,
      email: data.email,
      locale,
    });
    return { ok: true, message: t.waitlist.addedText(formatDateLong(data.date, false, locale), data.email) };
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, error: customerErrorText(error, locale) };
    console.error("[wachtlijst] Onverwachte fout:", error);
    return { ok: false, error: t.errors.generic };
  }
}
