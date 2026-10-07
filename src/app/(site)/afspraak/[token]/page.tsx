import { CalendarPlus, Clock, Phone, RotateCcw, Scissors, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ManageActions } from "@/components/booking/manage-actions";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { capitalize, formatDateLong, formatPrice, telHref } from "@/lib/format";
import { bookingHref } from "@/lib/links";
import { bookingWindow } from "@/server/services/availability";
import { customerChangePolicy, getAppointmentByToken } from "@/server/services/booking";
import { getSiteData } from "@/server/services/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Je afspraak",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const STATUS_COPY = {
  PENDING: {
    tone: "warning" as const,
    title: "Je aanvraag wacht op bevestiging",
    text: "We bekijken je aanvraag zo snel mogelijk. Je ontvangt een e-mail zodra de afspraak is bevestigd.",
  },
  APPROVED: {
    tone: "success" as const,
    title: "Je afspraak is bevestigd",
    text: "We zien je graag! Kun je toch niet? Verplaats of annuleer je afspraak hieronder.",
  },
  REJECTED: {
    tone: "error" as const,
    title: "Deze afspraak kon helaas niet worden bevestigd",
    text: "Kies gerust een ander moment.",
  },
  CANCELLED: {
    tone: "info" as const,
    title: "Deze afspraak is geannuleerd",
    text: "Wil je toch langskomen? Plan eenvoudig een nieuwe afspraak.",
  },
  COMPLETED: {
    tone: "success" as const,
    title: "Bedankt voor je bezoek!",
    text: "Tot de volgende keer. Je vorige behandeling plan je hieronder met één klik opnieuw in.",
  },
};

export default async function ManageAppointmentPage({ params }: PageProps<"/afspraak/[token]">) {
  const { token } = await params;
  const [managed, site] = await Promise.all([getAppointmentByToken(token), getSiteData()]);
  if (!managed) notFound();

  const { appointment: a, customer } = managed;
  const policy = customerChangePolicy(a, site.settings, site.now);
  const copy = STATUS_COPY[a.status];
  const range = bookingWindow(site.settings, site.now);
  const rebook = bookingHref({ serviceId: a.serviceId, barberId: a.anyBarber ? null : a.barberId });

  return (
    <div className="container-page max-w-3xl pt-28 pb-24 sm:pt-32">
      <p className="eyebrow flex items-center gap-3">
        <span className="gold-rule" aria-hidden />
        Je afspraak
      </p>
      <h1 className="heading-display mt-4 text-4xl sm:text-5xl">Hoi {customer.firstName}</h1>

      <Alert tone={copy.tone} title={copy.title} className="mt-8">
        {copy.text}
        {a.statusReason && (a.status === "REJECTED" || a.status === "CANCELLED") ? (
          <p className="mt-1">Toelichting: {a.statusReason}</p>
        ) : null}
      </Alert>

      <section aria-label="Afspraakgegevens" className="mt-6 rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="font-display text-3xl font-semibold text-ink">{capitalize(formatDateLong(a.date, true))}</p>
          <StatusBadge status={a.status} />
        </div>
        <dl className="mt-6 grid gap-5 sm:grid-cols-3">
          <div className="flex gap-3">
            <Clock className="mt-0.5 size-4 text-gold" aria-hidden />
            <div>
              <dt className="text-xs text-ink-faint">Tijd</dt>
              <dd className="text-ink tabular-nums">
                {a.startTime.slice(0, 5)} – {a.endTime.slice(0, 5)}
              </dd>
            </div>
          </div>
          <div className="flex gap-3">
            <Scissors className="mt-0.5 size-4 text-gold" aria-hidden />
            <div>
              <dt className="text-xs text-ink-faint">Behandeling</dt>
              <dd className="text-ink">
                {a.serviceName} · {formatPrice(a.priceCents)}
              </dd>
            </div>
          </div>
          <div className="flex gap-3">
            <UserRound className="mt-0.5 size-4 text-gold" aria-hidden />
            <div>
              <dt className="text-xs text-ink-faint">Barber</dt>
              <dd className="text-ink">{a.barberName}</dd>
            </div>
          </div>
        </dl>
        {a.status === "APPROVED" ? (
          <a
            href={`/api/afspraak/${token}/agenda.ics`}
            className={buttonClasses({ variant: "secondary", className: "mt-7" })}
          >
            <CalendarPlus className="size-4" aria-hidden /> Zet in je agenda
          </a>
        ) : null}
      </section>

      <div className="mt-8">
        {policy.allowed ? (
          <ManageActions token={token} today={site.now.date} lastDate={range.lastDate} />
        ) : a.status === "PENDING" || a.status === "APPROVED" ? (
          <Alert tone="info">
            {policy.reason}
            {site.settings.phone ? (
              <a href={telHref(site.settings.phone)} className="mt-2 flex items-center gap-2 font-semibold text-gold">
                <Phone className="size-4" aria-hidden /> {site.settings.phone}
              </a>
            ) : null}
          </Alert>
        ) : (
          <Link href={rebook} className={buttonClasses({ size: "lg" })}>
            <RotateCcw className="size-4" aria-hidden /> Opnieuw boeken
          </Link>
        )}
      </div>

      {a.status === "APPROVED" || a.status === "PENDING" ? (
        <p className="mt-10 text-sm text-ink-muted">
          Volgende afspraak alvast plannen?{" "}
          <Link href={rebook} className="font-medium text-gold hover:text-gold-bright">
            Boek dezelfde behandeling opnieuw
          </Link>
        </p>
      ) : null}
    </div>
  );
}
