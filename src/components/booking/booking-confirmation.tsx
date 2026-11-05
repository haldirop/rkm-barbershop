"use client";

import { CalendarClock, Check, Mail } from "lucide-react";
import Link from "next/link";
import type { BookingResult } from "@/app/(site)/[locale]/afspraak-maken/actions";
import { buttonClasses } from "@/components/ui/button";
import { useLocale } from "@/i18n/client";
import { localizePath } from "@/i18n/config";
import { booking } from "@/i18n/messages/booking";
import { capitalize } from "@/lib/format";

export function BookingConfirmation({ result }: { result: Extract<BookingResult, { ok: true }> }) {
  const { summary, token } = result;
  const locale = useLocale();
  const t = booking[locale].received;
  const labels = booking[locale];
  const group = summary.people.length > 1;
  return (
    <div className="mx-auto max-w-2xl animate-fade-up text-center" role="status" aria-live="polite">
      <span className="mx-auto grid size-16 place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold">
        <Check className="size-8" aria-hidden />
      </span>
      <h2 className="heading-display mt-6 text-4xl sm:text-5xl">{t.title}</h2>
      <p className="mx-auto mt-4 max-w-lg text-ink-muted sm:text-lg">{t.thanks(summary.firstName)}</p>

      <div className="mt-10 rounded-2xl border border-line bg-surface p-6 text-left sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="eyebrow">{t.yourRequest}</p>
          <span className="flex items-center gap-1.5 rounded-full bg-amber-400/12 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/30">
            <span className="size-1.5 rounded-full bg-amber-400" aria-hidden />
            {t.awaiting}
          </span>
        </div>
        {group ? (
          <ul className="mt-6 divide-y divide-line rounded-xl border border-line">
            {summary.people.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block font-medium text-ink">
                    {p.name?.trim() || (i === 0 ? labels.group.you : labels.group.person(i + 1))}
                  </span>
                  <span className="text-ink-muted">
                    {p.serviceName} · <span className="tabular-nums">{p.time}</span>
                  </span>
                </span>
                <span className="shrink-0 text-ink tabular-nums">{p.price}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          {!group ? (
            <div>
              <dt className="text-xs text-ink-faint">{labels.treatment}</dt>
              <dd className="text-ink">{summary.serviceName}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-ink-faint">{labels.barber}</dt>
            <dd className="text-ink">{summary.barberName}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">{t.date}</dt>
            <dd className="text-ink">{capitalize(summary.dateLabel)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">{t.time}</dt>
            <dd className="text-ink tabular-nums">{summary.time}</dd>
          </div>
        </dl>
        <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
          <span className="text-sm text-ink-muted">{group ? labels.group.total : t.price}</span>
          <span className="font-display text-3xl font-semibold text-gold-bright">{summary.price}</span>
        </div>
      </div>

      <ul className="mt-8 space-y-3 text-left text-sm text-ink-muted">
        <li className="flex gap-3">
          <Mail className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
          {t.emailSent(summary.email)}
        </li>
        <li className="flex gap-3">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
          {t.manageInfo}
        </li>
      </ul>

      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href={localizePath(`/afspraak/${token}`, locale)} className={buttonClasses({ size: "lg" })}>
          {t.view}
        </Link>
        <Link href={localizePath("/", locale)} className={buttonClasses({ size: "lg", variant: "secondary" })}>
          {t.home}
        </Link>
      </div>
    </div>
  );
}
