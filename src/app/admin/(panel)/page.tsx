import { ArrowRight, BellRing, CalendarCheck, CheckCheck, CircleCheck, Clock, Euro, Hourglass, ListChecks } from "lucide-react";
import Link from "next/link";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { RequestCard } from "@/components/admin/request-card";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { capitalize, formatDateLong, formatPrice } from "@/lib/format";
import { zonedNow } from "@/lib/time";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { hasDemoData } from "@/server/db/seed";
import { isMailConfigured } from "@/server/notifications/mailer";
import { listAppointmentsInRange, listPendingRequests } from "@/server/services/appointments";
import { getSettings } from "@/server/services/settings";
import { getDashboardStats } from "@/server/services/stats";

export const metadata = { title: "Overzicht" };

function greeting(minutes: number) {
  if (minutes < 12 * 60) return "Goedemorgen";
  if (minutes < 18 * 60) return "Goedemiddag";
  return "Goedenavond";
}

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const user = await requireAdmin();
  const passwordChanged = (await searchParams).wachtwoord === "gewijzigd";
  const now = zonedNow();
  const [stats, pending, today, settings, demo] = await Promise.all([
    getDashboardStats(),
    listPendingRequests(6),
    listAppointmentsInRange(now.date, now.date, { statuses: ["PENDING", "APPROVED", "COMPLETED"] }),
    getSettings(),
    hasDemoData(getDb()),
  ]);

  const checklist = [
    { done: Boolean(settings.detailsConfirmedAt), label: "Bedrijfsgegevens controleren", href: "/admin/instellingen" },
    { done: isMailConfigured(), label: "E-mail koppelen (Resend)", href: "/admin/instellingen#e-mail" },
    { done: !demo, label: "Demodata verwijderen", href: "/admin/instellingen#demodata" },
  ];

  const statCards = [
    { label: "Afspraken vandaag", value: String(stats.todayBooked), hint: stats.todayPending ? `+ ${stats.todayPending} aanvraag` : "bevestigd", Icon: CalendarCheck },
    { label: "Nieuwe aanvragen", value: String(stats.pending), hint: "wachten op jou", Icon: Hourglass, highlight: stats.pending > 0 },
    { label: "Komende bevestigd", value: String(stats.approvedUpcoming), hint: "vanaf vandaag", Icon: CheckCheck },
    { label: "Vrije tijd vandaag", value: `${Math.floor(stats.freeMinutesToday / 60)}u ${stats.freeMinutesToday % 60}m`, hint: "alle barbers samen", Icon: Clock },
    { label: "Omzet deze week", value: formatPrice(stats.weekRevenueCents), hint: "bevestigd + afgerond", Icon: Euro },
    { label: "Omzet deze maand", value: formatPrice(stats.monthRevenueCents), hint: "bevestigd + afgerond", Icon: Euro },
  ];

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={60} />
      {passwordChanged ? <Alert tone="success">Je nieuwe wachtwoord is opgeslagen.</Alert> : null}
      <header>
        <p className="text-sm text-ink-muted">{capitalize(formatDateLong(now.date, true))}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {greeting(now.minutes)}, {user.name.split(" ")[0]}
        </h1>
      </header>

      {stats.pending > 0 ? (
        <section
          aria-labelledby="pending-title"
          className="flex flex-col gap-4 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-amber-400 text-canvas">
              <BellRing className="size-6" aria-hidden />
            </span>
            <div>
              <h2 id="pending-title" className="text-xl font-semibold text-ink">
                {stats.pending} {stats.pending === 1 ? "nieuwe afspraakaanvraag" : "nieuwe afspraakaanvragen"}
              </h2>
              <p className="text-sm text-ink-muted">Keur ze goed of weiger ze — de klant krijgt automatisch bericht.</p>
            </div>
          </div>
          <ButtonLink href="/admin/afspraken?status=PENDING" size="lg" className="bg-amber-400 hover:bg-amber-300">
            Bekijk aanvragen <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </section>
      ) : (
        <section className="flex items-center gap-4 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-5">
          <CircleCheck className="size-6 shrink-0 text-emerald-400" aria-hidden />
          <p className="text-ink">Alle aanvragen zijn behandeld. Nieuwe aanvragen verschijnen hier vanzelf.</p>
        </section>
      )}

      {pending.length ? (
        <section aria-label="Openstaande aanvragen" className="grid gap-4 xl:grid-cols-2">
          {pending.map((item) => (
            <RequestCard key={item.id} item={item} />
          ))}
        </section>
      ) : null}

      <section aria-label="Kerncijfers" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {statCards.map(({ label, value, hint, Icon, highlight }) => (
          <div
            key={label}
            className={cn(
              "rounded-2xl border bg-surface p-4 sm:p-5",
              highlight ? "border-amber-400/40" : "border-line",
            )}
          >
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <Icon className={cn("size-4", highlight ? "text-amber-400" : "text-gold")} aria-hidden />
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink tabular-nums sm:text-3xl">{value}</p>
            <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title="Vandaag"
            description={today.length ? `${today.length} afspraken` : "Geen afspraken"}
            action={
              <Link href="/admin/agenda" className="text-sm font-medium text-gold hover:text-gold-bright">
                Naar agenda
              </Link>
            }
          />
          {today.length ? (
            <ul className="divide-y divide-line">
              {today.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/afspraken/${a.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2">
                    <span className="w-24 shrink-0 text-sm font-semibold text-ink tabular-nums">
                      {a.startTime.slice(0, 5)}–{a.endTime.slice(0, 5)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ink">
                        {a.firstName} {a.lastName}
                      </span>
                      <span className="block truncate text-sm text-ink-muted">
                        {a.serviceName} · {a.barberName}
                      </span>
                    </span>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-ink-muted">Er staan vandaag geen afspraken gepland.</p>
          )}
        </Card>

        <div className="space-y-6">
          {checklist.some((c) => !c.done) ? (
            <Card>
              <CardHeader title="Klaar voor livegang?" description="Rond deze punten af voordat je de website deelt." />
              <ul className="space-y-1 p-3">
                {checklist.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-surface-2">
                      {item.done ? (
                        <CircleCheck className="size-5 text-emerald-400" aria-hidden />
                      ) : (
                        <ListChecks className="size-5 text-amber-400" aria-hidden />
                      )}
                      <span className={item.done ? "text-ink-faint line-through" : "text-ink"}>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Populair deze maand" />
            {stats.popularServices.length ? (
              <ul className="space-y-3 p-5">
                {stats.popularServices.map((s) => {
                  const max = stats.popularServices[0].total;
                  return (
                    <li key={s.name}>
                      <div className="flex justify-between text-sm">
                        <span className="text-ink">{s.name}</span>
                        <span className="text-ink-muted tabular-nums">{s.total}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-surface-3">
                        <div className="h-full rounded-full bg-gold" style={{ width: `${(s.total / max) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="p-5 text-sm text-ink-muted">Nog geen afspraken deze maand.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
