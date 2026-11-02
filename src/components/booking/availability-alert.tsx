"use client";

import { BellRing, CalendarX2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { requestAvailabilityAlert, type AlertResult } from "@/app/(site)/[locale]/afspraak-maken/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { useLocale } from "@/i18n/client";
import { localizePath } from "@/i18n/config";
import { booking } from "@/i18n/messages/booking";
import { formatDateLong } from "@/lib/format";
import { STORAGE_KEYS, useStoredValue } from "./hooks";

/** Shown instead of the time slots on a fully booked day: "stuur me een e-mail als er plek vrijkomt". */
export function AvailabilityAlert({
  date,
  serviceId,
  barberId,
}: {
  date: string;
  serviceId: string;
  /** null = any barber */
  barberId: string | null;
}) {
  const locale = useLocale();
  const t = booking[locale];
  const id = useId();
  const [wanted, setWanted] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [result, setResult] = useState<AlertResult | null>(null);
  const [pending, startTransition] = useTransition();
  const stored = useStoredValue(STORAGE_KEYS.customer);
  const day = formatDateLong(date, false, locale);

  // Details remembered from an earlier booking on this device fill in the e-mail address.
  let rememberedEmail = "";
  try {
    rememberedEmail = stored ? (JSON.parse(stored).email ?? "") : "";
  } catch {}
  const value = email ?? rememberedEmail;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const website = new FormData(event.currentTarget).get("website");
    startTransition(async () => {
      setResult(
        await requestAvailabilityAlert({ serviceId, barberId, date, email: value, website: website || undefined }, locale),
      );
    });
  }

  if (result?.ok) {
    return (
      <Alert tone="success" title={t.waitlist.added}>
        {result.message}
      </Alert>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-5 sm:p-6">
      <p className="flex items-center gap-2.5 font-semibold text-ink">
        <CalendarX2 className="size-5 shrink-0 text-red-300" aria-hidden />
        {t.waitlist.full}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{t.waitlist.fullText}</p>

      <label htmlFor={`${id}-wanted`} className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-line-strong bg-surface p-4 transition-colors hover:border-gold/50">
        <Checkbox id={`${id}-wanted`} checked={wanted} onChange={(e) => setWanted(e.target.checked)} className="mt-0.5" />
        <span className="text-sm text-ink">
          <span className="flex items-center gap-1.5 font-semibold">
            <BellRing className="size-4 text-gold" aria-hidden />
            {t.waitlist.keepPosted}
          </span>
          <span className="mt-0.5 block text-ink-muted">{t.waitlist.keepPostedText(day)}</span>
        </span>
      </label>

      {wanted ? (
        <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
          <Field
            label={t.emailLabel}
            htmlFor={`${id}-email`}
            error={result && !result.ok ? (result.fieldErrors?.email ?? undefined) : undefined}
          >
            <Input
              id={`${id}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={value}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.waitlist.emailPlaceholder}
            />
          </Field>
          {/* Honeypot for bots; hidden from people and screen readers. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          {result && !result.ok && !result.fieldErrors?.email ? <Alert tone="error">{result.error}</Alert> : null}
          <Button type="submit" disabled={pending || !value.trim()} className="w-full sm:w-auto">
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <BellRing className="size-4" aria-hidden />}
            {t.waitlist.signUp}
          </Button>
          <p className="text-xs leading-relaxed text-ink-faint">
            {t.waitlist.privacyBefore}{" "}
            <Link href={localizePath("/privacy", locale)} className="underline underline-offset-2 hover:text-ink">
              {t.privacyLink}
            </Link>
            .
          </p>
        </form>
      ) : null}
    </div>
  );
}
