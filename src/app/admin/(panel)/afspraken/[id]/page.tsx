import { Mail, MessageSquare, Pencil, Phone, StickyNote, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { StatusActions } from "@/components/admin/status-actions";
import { Badge, DemoBadge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { capitalize, formatDateLong, formatDateTime, formatDuration, formatPrice, telHref } from "@/lib/format";
import { timeToMinutes, zonedNow } from "@/lib/time";
import { uuidSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/auth/session";
import { getAppointmentDetail } from "@/server/services/appointments";

export const metadata = { title: "Afspraak" };

const EVENT_LABELS: Record<string, string> = {
  CREATED: "Aangemaakt",
  APPROVED: "Goedgekeurd",
  REJECTED: "Geweigerd",
  CANCELLED: "Geannuleerd",
  COMPLETED: "Afgerond",
  RESCHEDULED: "Verplaatst door klant",
  UPDATED: "Gewijzigd",
  REOPENED: "Opnieuw bevestigd",
};

const ACTOR_LABELS = { CUSTOMER: "klant", ADMIN: "beheer", SYSTEM: "systeem" } as const;

const EMAIL_STATUS = {
  SENT: { label: "Verstuurd", className: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30" },
  LOGGED: { label: "Alleen gelogd", className: "bg-zinc-400/10 text-zinc-300 ring-zinc-400/30" },
  FAILED: { label: "Mislukt", className: "bg-red-400/10 text-red-300 ring-red-400/30" },
};

export default async function AppointmentDetailPage({ params }: PageProps<"/admin/afspraken/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const detail = await getAppointmentDetail(id);
  if (!detail) notFound();

  const { appointment: a, customer: c } = detail;
  const now = zonedNow();
  const isPast = a.date < now.date || (a.date === now.date && timeToMinutes(a.endTime) <= now.minutes);

  return (
    <div>
      <PageHeader
        back={{ href: "/admin/afspraken", label: "Alle afspraken" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {c.firstName} {c.lastName}
            <StatusBadge status={a.status} className="text-sm" />
            {a.isDemo ? <DemoBadge /> : null}
          </span>
        }
        description={`${capitalize(formatDateLong(a.date, true))} · ${a.startTime.slice(0, 5)} – ${a.endTime.slice(0, 5)}`}
      />

      <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <StatusActions id={a.id} status={a.status} hasEmail={Boolean(c.email)} isPast={isPast} />
        <ButtonLink href={`/admin/afspraken/${a.id}/bewerken`} variant="secondary">
          <Pencil className="size-4" aria-hidden /> Bewerken
        </ButtonLink>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Afspraak" />
            <dl className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2">
              {[
                ["Behandeling", a.serviceName],
                ["Barber", a.barberName + (a.anyBarber ? " (klant had geen voorkeur)" : "")],
                ["Datum", capitalize(formatDateLong(a.date, true))],
                ["Tijd", `${a.startTime.slice(0, 5)} – ${a.endTime.slice(0, 5)}`],
                ["Duur", formatDuration(a.durationMinutes)],
                ["Prijs", formatPrice(a.priceCents)],
                ["Bron", a.source === "ONLINE" ? "Online aangevraagd" : "Ingepland door beheer"],
                ["Aangemaakt", formatDateTime(a.createdAt)],
                ...(a.statusChangedAt ? [["Status gewijzigd", formatDateTime(a.statusChangedAt)]] : []),
                ...(a.reminderSentAt ? [["Herinnering verstuurd", formatDateTime(a.reminderSentAt)]] : []),
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-ink-faint">{label}</dt>
                  <dd className="mt-0.5 text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {a.statusReason ? (
              <p className="mx-5 mb-5 rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink-muted">
                <span className="font-medium text-ink">Toelichting status:</span> {a.statusReason}
              </p>
            ) : null}
          </Card>

          {a.notes || a.adminNotes ? (
            <Card>
              <CardHeader title="Notities" />
              <div className="space-y-4 p-5 text-sm">
                {a.notes ? (
                  <p className="flex gap-3">
                    <MessageSquare className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                    <span>
                      <span className="block text-xs text-ink-faint">Opmerking van de klant</span>
                      <span className="text-ink">{a.notes}</span>
                    </span>
                  </p>
                ) : null}
                {a.adminNotes ? (
                  <p className="flex gap-3">
                    <StickyNote className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                    <span>
                      <span className="block text-xs text-ink-faint">Interne notitie</span>
                      <span className="text-ink">{a.adminNotes}</span>
                    </span>
                  </p>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Geschiedenis" />
            <ol className="space-y-4 p-5">
              {detail.events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" aria-hidden />
                  <div>
                    <p className="text-ink">
                      {EVENT_LABELS[e.type] ?? e.type}
                      <span className="text-ink-faint">
                        {" "}
                        door {e.userName ?? ACTOR_LABELS[e.actor]} · {formatDateTime(e.createdAt)}
                      </span>
                    </p>
                    {e.message ? <p className="text-ink-muted">{e.message}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Klant"
              action={
                <Link href={`/admin/klanten/${c.id}`} className="text-sm font-medium text-gold hover:text-gold-bright">
                  Klantkaart
                </Link>
              }
            />
            <div className="space-y-3 p-5 text-sm">
              <p className="flex items-center gap-3 text-ink">
                <UserRound className="size-4 text-gold" aria-hidden />
                {c.firstName} {c.lastName}
              </p>
              <a href={telHref(c.phone)} className="flex items-center gap-3 text-ink hover:text-gold-bright">
                <Phone className="size-4 text-gold" aria-hidden />
                {c.phone}
              </a>
              {c.email ? (
                <a href={`mailto:${c.email}`} className="flex items-center gap-3 break-all text-ink hover:text-gold-bright">
                  <Mail className="size-4 shrink-0 text-gold" aria-hidden />
                  {c.email}
                </a>
              ) : (
                <p className="flex items-center gap-3 text-ink-faint">
                  <Mail className="size-4" aria-hidden /> Geen e-mailadres
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Verzonden e-mails" description="Berichten over deze afspraak" />
            {detail.emails.length ? (
              <ul className="divide-y divide-line">
                {detail.emails.map((m) => (
                  <li key={m.id} className="px-5 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-ink">{m.subject}</span>
                      <Badge className={EMAIL_STATUS[m.status].className}>{EMAIL_STATUS[m.status].label}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      Aan {m.recipient} · {formatDateTime(m.createdAt)}
                    </p>
                    {m.error ? <p className="mt-1 text-xs text-red-300">{m.error}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-5 text-sm text-ink-muted">Nog geen e-mails verstuurd.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
