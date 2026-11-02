import "server-only";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import type { CustomerErrorKey } from "@/i18n/messages/booking";
import { booking } from "@/i18n/messages/booking";
import { isIsoDate } from "@/lib/time";
import { getBarber, getService } from "@/server/services/catalog";
import { getAppointmentByToken } from "@/server/services/booking";
import type { AvailabilityQuery } from "@/server/services/availability";

const paramsSchema = z.object({
  behandeling: z.uuid().optional(),
  barber: z.uuid().optional(),
  afspraak: z.string().max(120).optional(),
});

export type ResolvedQuery = { ok: true; query: AvailabilityQuery } | { ok: false; status: number; error: string };

/** An error message in the language of the page that asked (?taal=en|de; Dutch by default). */
export function apiError(params: URLSearchParams, key: CustomerErrorKey): string {
  const requested = params.get("taal");
  return booking[isLocale(requested) ? requested : DEFAULT_LOCALE].errors[key];
}

/**
 * Turns public query parameters into an availability query. Either a service
 * (+ optional barber) or a manage-link token (when moving an existing appointment).
 */
export async function resolveAvailabilityQuery(params: URLSearchParams): Promise<ResolvedQuery> {
  const parsed = paramsSchema.safeParse(Object.fromEntries(params));
  if (!parsed.success) return { ok: false, status: 400, error: apiError(params, "invalidRequest") };
  const { behandeling, barber, afspraak } = parsed.data;

  if (afspraak) {
    const managed = await getAppointmentByToken(afspraak);
    if (!managed) return { ok: false, status: 404, error: apiError(params, "appointmentNotFound") };
    const a = managed.appointment;
    return {
      ok: true,
      query: {
        durationMinutes: a.durationMinutes,
        barberId: a.anyBarber ? null : a.barberId,
        excludeAppointmentId: a.id,
      },
    };
  }

  if (!behandeling) return { ok: false, status: 400, error: apiError(params, "chooseService") };
  const service = await getService(behandeling);
  if (!service?.isActive) return { ok: false, status: 404, error: apiError(params, "serviceNotFound") };
  if (barber) {
    const b = await getBarber(barber);
    if (!b?.isActive) return { ok: false, status: 404, error: apiError(params, "barberNotFound") };
  }
  return { ok: true, query: { durationMinutes: service.durationMinutes, barberId: barber ?? null } };
}

export function dateParam(params: URLSearchParams, name: string): string | null {
  const value = params.get(name);
  return value && isIsoDate(value) ? value : null;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Wraps a route handler: unexpected failures (e.g. database unreachable) become a friendly JSON error. */
export function handled(handler: (params: URLSearchParams) => Promise<Response>) {
  return async (request: NextRequest) => {
    try {
      return await handler(request.nextUrl.searchParams);
    } catch (error) {
      console.error("[beschikbaarheid] Ophalen mislukt:", error);
      return json({ error: apiError(request.nextUrl.searchParams, "calendarUnavailable") }, 503);
    }
  };
}
