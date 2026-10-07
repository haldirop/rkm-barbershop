"use client";

import { CalendarClock, Check, Mail } from "lucide-react";
import Link from "next/link";
import type { BookingResult } from "@/app/(site)/afspraak-maken/actions";
import { buttonClasses } from "@/components/ui/button";
import { capitalize } from "@/lib/format";

export function BookingConfirmation({ result }: { result: Extract<BookingResult, { ok: true }> }) {
  const { summary, token } = result;
  return (
    <div className="mx-auto max-w-2xl animate-fade-up text-center" role="status" aria-live="polite">
      <span className="mx-auto grid size-16 place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold">
        <Check className="size-8" aria-hidden />
      </span>
      <h2 className="heading-display mt-6 text-4xl sm:text-5xl">Aanvraag ontvangen</h2>
      <p className="mx-auto mt-4 max-w-lg text-ink-muted sm:text-lg">
        Bedankt, {summary.firstName}! Je afspraakaanvraag is ontvangen. We laten je weten zodra RKM Barbershop de
        afspraak heeft bevestigd.
      </p>

      <div className="mt-10 rounded-2xl border border-line bg-surface p-6 text-left sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="eyebrow">Je aanvraag</p>
          <span className="flex items-center gap-1.5 rounded-full bg-amber-400/12 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/30">
            <span className="size-1.5 rounded-full bg-amber-400" aria-hidden />
            Wacht op bevestiging
          </span>
        </div>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-ink-faint">Behandeling</dt>
            <dd className="text-ink">{summary.serviceName}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Barber</dt>
            <dd className="text-ink">{summary.barberName}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Datum</dt>
            <dd className="text-ink">{capitalize(summary.dateLabel)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Tijd</dt>
            <dd className="text-ink tabular-nums">{summary.time}</dd>
          </div>
        </dl>
        <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
          <span className="text-sm text-ink-muted">Prijs</span>
          <span className="font-display text-3xl font-semibold text-gold-bright">{summary.price}</span>
        </div>
      </div>

      <ul className="mt-8 space-y-3 text-left text-sm text-ink-muted">
        <li className="flex gap-3">
          <Mail className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
          We sturen een bevestiging van je aanvraag naar {summary.email}. Zodra we je afspraak hebben bekeken,
          ontvang je nog een e-mail.
        </li>
        <li className="flex gap-3">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
          Via de link in de e-mail kun je je afspraak altijd bekijken, verplaatsen of annuleren.
        </li>
      </ul>

      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href={`/afspraak/${token}`} className={buttonClasses({ size: "lg" })}>
          Bekijk je afspraak
        </Link>
        <Link href="/" className={buttonClasses({ size: "lg", variant: "secondary" })}>
          Terug naar home
        </Link>
      </div>
    </div>
  );
}
