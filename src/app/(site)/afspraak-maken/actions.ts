"use server";

import { after } from "next/server";
import { formatDateLong, formatPrice } from "@/lib/format";
import { bookingRequestSchema, fieldErrors, type FieldErrors } from "@/lib/validation";
import { clientIp, isRateLimited, recordHit } from "@/server/auth/rate-limit";
import { notifyRequested } from "@/server/notifications/notify";
import { createBookingRequest } from "@/server/services/booking";
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
      };
    }
  | { ok: false; error: string; fieldErrors?: FieldErrors; slotTaken?: boolean };

const GENERIC_ERROR = "Er ging iets mis bij het versturen. Probeer het opnieuw of bel ons even.";

export async function requestAppointment(input: unknown): Promise<BookingResult> {
  const parsed = bookingRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Controleer de gemarkeerde velden.", fieldErrors: fieldErrors(parsed.error) };
  }
  const data = parsed.data;
  // Honeypot filled in: almost certainly a bot. Answer vaguely, store nothing.
  if (data.website) return { ok: false, error: GENERIC_ERROR };

  const ipKey = `booking:${await clientIp()}`;
  if (await isRateLimited(ipKey, 6, 30)) {
    return {
      ok: false,
      error: "Je hebt in korte tijd veel aanvragen gedaan. Probeer het later opnieuw of bel ons.",
    };
  }
  await recordHit(ipKey);

  try {
    const { appointment, token } = await createBookingRequest({
      serviceId: data.serviceId,
      barberId: data.barberId,
      date: data.date,
      startTime: data.startTime,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
    });
    // E-mails are sent after the response, so the customer isn't kept waiting.
    after(() => notifyRequested(appointment.id));
    return {
      ok: true,
      token,
      summary: {
        serviceName: appointment.serviceName,
        barberName: appointment.barberName,
        dateLabel: formatDateLong(appointment.date),
        time: `${appointment.startTime.slice(0, 5)} – ${appointment.endTime.slice(0, 5)}`,
        price: formatPrice(appointment.priceCents),
        firstName: data.firstName,
        email: data.email,
      },
    };
  } catch (error) {
    if (error instanceof DomainError) {
      return { ok: false, error: error.message, slotTaken: error.code === "SLOT_TAKEN" };
    }
    console.error("[boeking] Onverwachte fout:", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}
