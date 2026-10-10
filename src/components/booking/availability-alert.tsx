"use client";

import { BellRing, CalendarX2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { requestAvailabilityAlert, type AlertResult } from "@/app/(site)/afspraak-maken/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form";
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
  const id = useId();
  const [wanted, setWanted] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [result, setResult] = useState<AlertResult | null>(null);
  const [pending, startTransition] = useTransition();
  const stored = useStoredValue(STORAGE_KEYS.customer);
  const day = formatDateLong(date);

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
      setResult(await requestAvailabilityAlert({ serviceId, barberId, date, email: value, website: website || undefined }));
    });
  }

  if (result?.ok) {
    return (
      <Alert tone="success" title="Je krijgt bericht">
        {result.message}
      </Alert>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-5 sm:p-6">
      <p className="flex items-center gap-2.5 font-semibold text-ink">
        <CalendarX2 className="size-5 shrink-0 text-red-300" aria-hidden />
        Deze dag is volgeboekt
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
        Kies een andere dag, of laat je e-mailadres achter. Zegt iemand af, dan hoor je het meteen.
      </p>

      <label htmlFor={`${id}-wanted`} className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-line-strong bg-surface p-4 transition-colors hover:border-gold/50">
        <Checkbox id={`${id}-wanted`} checked={wanted} onChange={(e) => setWanted(e.target.checked)} className="mt-0.5" />
        <span className="text-sm text-ink">
          <span className="flex items-center gap-1.5 font-semibold">
            <BellRing className="size-4 text-gold" aria-hidden />
            Houd me op de hoogte
          </span>
          <span className="mt-0.5 block text-ink-muted">Stuur me een e-mail als er op {day} toch een plek vrijkomt.</span>
        </span>
      </label>

      {wanted ? (
        <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
          <Field
            label="E-mailadres"
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
              placeholder="jij@voorbeeld.nl"
            />
          </Field>
          {/* Honeypot for bots; hidden from people and screen readers. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          {result && !result.ok && !result.fieldErrors?.email ? <Alert tone="error">{result.error}</Alert> : null}
          <Button type="submit" disabled={pending || !value.trim()} className="w-full sm:w-auto">
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <BellRing className="size-4" aria-hidden />}
            Meld me aan
          </Button>
          <p className="text-xs leading-relaxed text-ink-faint">
            We gebruiken je e-mailadres alleen voor deze ene melding en verwijderen het daarna. Zie onze{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
              privacyverklaring
            </Link>
            .
          </p>
        </form>
      ) : null}
    </div>
  );
}
