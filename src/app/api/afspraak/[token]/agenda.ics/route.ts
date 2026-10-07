import { timeToMinutes, zonedToUtc } from "@/lib/time";
import { getAppointmentByToken } from "@/server/services/booking";
import { formatAddress, loadSettings, siteUrl } from "@/server/services/settings";

function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545 line folding (max 75 octets per line). */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

/** GET /api/afspraak/<token>/agenda.ics — calendar file for a confirmed appointment. */
export async function GET(_request: Request, ctx: RouteContext<"/api/afspraak/[token]/agenda.ics">) {
  const { token } = await ctx.params;
  const managed = await getAppointmentByToken(token);
  if (!managed || managed.appointment.status !== "APPROVED") {
    return new Response("Afspraak niet gevonden of nog niet bevestigd.", { status: 404 });
  }
  const a = managed.appointment;
  const settings = await loadSettings();
  const start = zonedToUtc(a.date, timeToMinutes(a.startTime));
  const end = zonedToUtc(a.date, timeToMinutes(a.endTime));

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RKM Barbershop//Afspraken//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${a.id}@rkm-barbershop`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(`${a.serviceName} bij ${settings.businessName}`)}`,
    `LOCATION:${icsText(formatAddress(settings))}`,
    `DESCRIPTION:${icsText(`Barber: ${a.barberName}\nWijzigen of annuleren: ${siteUrl()}/afspraak/${token}`)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(`Afspraak bij ${settings.businessName}`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="afspraak-rkm-barbershop.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
