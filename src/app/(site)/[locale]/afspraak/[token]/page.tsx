import { CalendarPlus, Clock, Phone, RotateCcw, Scissors, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ManageActions } from "@/components/booking/manage-actions";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { localizePath } from "@/i18n/config";
import { localizeService } from "@/i18n/content";
import { translateCustomerMessage } from "@/i18n/errors";
import { booking } from "@/i18n/messages/booking";
import { common } from "@/i18n/messages/common";
import { home } from "@/i18n/messages/home";
import { pageLocale } from "@/i18n/server";
import { capitalize, formatDateLong, formatPrice, telHref } from "@/lib/format";
import { bookingHref } from "@/lib/links";
import { bookingWindow } from "@/server/services/availability";
import { customerChangePolicy, getAppointmentByToken } from "@/server/services/booking";
import { getService } from "@/server/services/catalog";
import { getSiteData } from "@/server/services/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/afspraak/[token]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  return {
    title: home[locale].meta.manageTitle,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

const TONES = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  CANCELLED: "info",
  COMPLETED: "success",
  NO_SHOW: "info",
} as const;

export default async function ManageAppointmentPage({ params }: PageProps<"/[locale]/afspraak/[token]">) {
  const locale = await pageLocale(params);
  const { token } = await params;
  const [managed, site] = await Promise.all([getAppointmentByToken(token), getSiteData(locale)]);
  if (!managed) notFound();

  const t = booking[locale].manage;
  const { appointment: a, customer } = managed;
  const policy = customerChangePolicy(a, site.settings, site.now);
  const copy = { tone: TONES[a.status], ...t.status[a.status] };
  const range = bookingWindow(site.settings, site.now);
  const rebook = localizePath(bookingHref({ serviceId: a.serviceId, barberId: a.anyBarber ? null : a.barberId }), locale);
  // The appointment keeps the Dutch name for the shop; show the treatment in the page language.
  const service = a.serviceId ? await getService(a.serviceId) : null;
  const serviceName = service ? localizeService(service, locale).name : a.serviceName;

  return (
    <div className="container-page max-w-3xl pt-28 pb-24 sm:pt-32">
      <p className="eyebrow flex items-center gap-3">
        <span className="gold-rule" aria-hidden />
        {t.eyebrow}
      </p>
      <h1 className="heading-display mt-4 text-4xl sm:text-5xl">{t.hi(customer.firstName)}</h1>

      <Alert tone={copy.tone} title={copy.title} className="mt-8">
        {copy.text}
        {a.statusReason && (a.status === "REJECTED" || a.status === "CANCELLED") ? (
          <p className="mt-1">{t.reason(a.statusReason)}</p>
        ) : null}
      </Alert>

      <section aria-label={t.detailsLabel} className="mt-6 rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="font-display text-3xl font-semibold text-ink">{capitalize(formatDateLong(a.date, true, locale))}</p>
          <StatusBadge status={a.status} label={common[locale].status[a.status]} />
        </div>
        <dl className="mt-6 grid gap-5 sm:grid-cols-3">
          <div className="flex gap-3">
            <Clock className="mt-0.5 size-4 text-gold" aria-hidden />
            <div>
              <dt className="text-xs text-ink-faint">{t.time}</dt>
              <dd className="text-ink tabular-nums">
                {a.startTime.slice(0, 5)} – {a.endTime.slice(0, 5)}
              </dd>
            </div>
          </div>
          <div className="flex gap-3">
            <Scissors className="mt-0.5 size-4 text-gold" aria-hidden />
            <div>
              <dt className="text-xs text-ink-faint">{booking[locale].treatment}</dt>
              <dd className="text-ink">
                {serviceName} · {formatPrice(a.priceCents, locale)}
              </dd>
            </div>
          </div>
          <div className="flex gap-3">
            <UserRound className="mt-0.5 size-4 text-gold" aria-hidden />
            <div>
              <dt className="text-xs text-ink-faint">{booking[locale].barber}</dt>
              <dd className="text-ink">{a.barberName}</dd>
            </div>
          </div>
        </dl>
        {a.status === "APPROVED" ? (
          <a
            href={`/api/afspraak/${token}/agenda.ics`}
            className={buttonClasses({ variant: "secondary", className: "mt-7" })}
          >
            <CalendarPlus className="size-4" aria-hidden /> {t.addToCalendar}
          </a>
        ) : null}
      </section>

      <div className="mt-8">
        {policy.allowed ? (
          <ManageActions token={token} today={site.now.date} lastDate={range.lastDate} />
        ) : a.status === "PENDING" || a.status === "APPROVED" ? (
          <Alert tone="info">
            {policy.message ? translateCustomerMessage(policy.message, locale) : policy.reason}
            {site.settings.phone ? (
              <a href={telHref(site.settings.phone)} className="mt-2 flex items-center gap-2 font-semibold text-gold">
                <Phone className="size-4" aria-hidden /> {site.settings.phone}
              </a>
            ) : null}
          </Alert>
        ) : (
          <Link href={rebook} className={buttonClasses({ size: "lg" })}>
            <RotateCcw className="size-4" aria-hidden /> {t.rebook}
          </Link>
        )}
      </div>

      {a.status === "APPROVED" || a.status === "PENDING" ? (
        <p className="mt-10 text-sm text-ink-muted">
          {t.planNext}{" "}
          <Link href={rebook} className="font-medium text-gold hover:text-gold-bright">
            {t.bookSame}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
