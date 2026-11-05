import { DEFAULT_LOCALE, isLocale, localizedUrl } from "@/i18n/config";
import { localizeService } from "@/i18n/content";
import { email as emailMessages } from "@/i18n/messages/email";
import { timeToMinutes, zonedToUtc } from "@/lib/time";
import { getAppointmentByToken } from "@/server/services/booking";
import { getService } from "@/server/services/catalog";
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
    return new Response(emailMessages.nl.calendar.notFound, { status: 404 });
  }
  const a = managed.appointment;
  // In the language the customer booked in.
  const locale = isLocale(a.locale) ? a.locale : DEFAULT_LOCALE;
  const t = emailMessages[locale].calendar;
  // A booking for several people is one event, from the first start to the last end.
  const members = managed.group.filter((m) => m.status === "APPROVED");
  const names = await Promise.all(
    members.map(async (m) => {
      const service = m.serviceId ? await getService(m.serviceId) : null;
      return service ? localizeService(service, locale).name : m.serviceName;
    }),
  );
  const serviceName = [...new Set(names)].join(" + ");
  const settings = await loadSettings();
  const start = zonedToUtc(a.date, timeToMinutes(members[0].startTime));
  const end = zonedToUtc(a.date, timeToMinutes(members[members.length - 1].endTime));

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//RKM Barbershop//Afspraken//${locale.toUpperCase()}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${a.id}@rkm-barbershop`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(t.summary(serviceName, settings.businessName))}`,
    `LOCATION:${icsText(formatAddress(settings))}`,
    `DESCRIPTION:${icsText(t.description(a.barberName, localizedUrl(siteUrl(), `/afspraak/${token}`, locale)))}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(t.alarm(settings.businessName))}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${t.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
