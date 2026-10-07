"use client";

import { ArrowLeft, ArrowRight, Check, Clock, LoaderCircle, Lock, Scissors, Star, UserRound, Users } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { requestAppointment, type BookingResult } from "@/app/(site)/afspraak-maken/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { capitalize, formatDateLong, formatDuration, formatPrice } from "@/lib/format";
import { timeToMinutes, minutesToTime } from "@/lib/time";
import { customerDetailsSchema, fieldErrors, type FieldErrors } from "@/lib/validation";
import { DateTimePicker, type DateTimeValue } from "./date-time-picker";
import { STORAGE_KEYS, useStoredValue, writeStoredValue } from "./hooks";
import { BookingConfirmation } from "./booking-confirmation";

export interface ServiceOption {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  durationMinutes: number;
}

export interface BarberOption {
  id: string;
  name: string;
  bio: string | null;
}

type StepId = "service" | "barber" | "datetime" | "details" | "confirm";
type BarberChoice = string | "any";

const STEP_META: Record<StepId, { slug: string; label: string }> = {
  service: { slug: "behandeling", label: "Behandeling" },
  barber: { slug: "barber", label: "Barber" },
  datetime: { slug: "moment", label: "Datum & tijd" },
  details: { slug: "gegevens", label: "Gegevens" },
  confirm: { slug: "bevestigen", label: "Bevestigen" },
};

interface Details {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
}

const EMPTY_DETAILS: Details = { firstName: "", lastName: "", phone: "", email: "", notes: "" };

export function BookingWizard({
  services,
  barbers,
  today,
  lastDate,
  initial,
}: {
  services: ServiceOption[];
  barbers: BarberOption[];
  today: string;
  lastDate: string;
  initial: { serviceId?: string; barberId?: BarberChoice; date?: string; time?: string };
}) {
  const steps = useMemo<StepId[]>(
    () => (barbers.length > 1 ? ["service", "barber", "datetime", "details", "confirm"] : ["service", "datetime", "details", "confirm"]),
    [barbers.length],
  );
  const onlyBarber = barbers.length === 1 ? barbers[0].id : null;
  const initialBarber: BarberChoice | null = initial.barberId ?? (initial.date ? "any" : onlyBarber);

  const [serviceId, setServiceId] = useState<string | null>(initial.serviceId ?? null);
  const [barberChoice, setBarberChoice] = useState<BarberChoice | null>(initialBarber);
  const [slot, setSlot] = useState<DateTimeValue>({ date: initial.date ?? null, time: initial.time ?? null });
  const [details, setDetails] = useState<Details | null>(null);
  const [remember, setRemember] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<BookingResult, { ok: true }> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const topRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const favoriteBarber = useStoredValue(STORAGE_KEYS.favoriteBarber);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const barber = barbers.find((b) => b.id === barberChoice) ?? null;

  // The furthest step the customer may be on, given what has been filled in.
  const firstIncomplete: StepId = !service
    ? "service"
    : steps.includes("barber") && !barberChoice
      ? "barber"
      : !slot.date || !slot.time
        ? "datetime"
        : !details
          ? "details"
          : "confirm";

  const [landingStep] = useState<StepId>(() =>
    !initial.serviceId ? "service" : steps.includes("barber") && !initialBarber ? "barber" : "datetime",
  );
  const requested = Object.entries(STEP_META).find(([, m]) => m.slug === searchParams.get("stap"))?.[0] as
    | StepId
    | undefined;
  const order = (s: StepId) => steps.indexOf(s);
  const target = requested && steps.includes(requested) ? requested : landingStep;
  const step: StepId = order(target) <= order(firstIncomplete) ? target : firstIncomplete;

  const goTo = useCallback(
    (next: StepId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("stap", STEP_META[next].slug);
      window.history.pushState(null, "", `${pathname}?${params.toString()}`);
      requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    },
    [pathname, searchParams],
  );

  const next = (from: StepId) => goTo(steps[order(from) + 1]);
  const back = (from: StepId) => goTo(steps[Math.max(0, order(from) - 1)]);

  const query = service
    ? `behandeling=${service.id}${barberChoice && barberChoice !== "any" ? `&barber=${barberChoice}` : ""}`
    : "";

  const onSlotChange = useCallback((value: DateTimeValue) => {
    setSlot(value);
    setError(null);
  }, []);

  function submit() {
    if (!service || !slot.date || !slot.time || !details) return;
    setError(null);
    startTransition(async () => {
      const response = await requestAppointment({
        ...details,
        serviceId: service.id,
        barberId: barberChoice === "any" || !barberChoice ? null : barberChoice,
        date: slot.date,
        startTime: slot.time,
        privacyAccepted: privacy,
        website: (document.getElementById("website") as HTMLInputElement | null)?.value ?? "",
      });
      if (response.ok) {
        writeStoredValue(STORAGE_KEYS.favoriteBarber, barber ? barber.id : favoriteBarber);
        writeStoredValue(
          STORAGE_KEYS.customer,
          remember ? JSON.stringify({ ...details, notes: "" }) : null,
        );
        setResult(response);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setError(response.error);
      if (response.slotTaken) {
        setSlot({ date: slot.date, time: null });
        setRefreshKey((k) => k + 1);
        goTo("datetime");
      } else if (response.fieldErrors && Object.keys(response.fieldErrors).some((k) => k in EMPTY_DETAILS)) {
        setServerErrors(response.fieldErrors);
        goTo("details");
      }
    });
  }

  if (result) return <BookingConfirmation result={result} />;

  const summary = (
    <BookingSummary
      service={service}
      barberLabel={barberChoice === "any" ? "Eerst beschikbare barber" : (barber?.name ?? null)}
      showBarber={steps.includes("barber")}
      date={slot.date}
      time={slot.time}
    />
  );

  return (
    <div ref={topRef} className="scroll-mt-24">
      <StepIndicator steps={steps} current={step} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-12">
        <div className="min-w-0">
          {error && step !== "confirm" ? <Alert tone="error" className="mb-6">{error}</Alert> : null}

          {step === "service" ? (
            <StepSection title="Welke behandeling wil je?" subtitle="De tijd van de behandeling reserveren we volledig voor je.">
              <ul className="grid gap-3 sm:grid-cols-2">
                {services.map((s) => (
                  <li key={s.id}>
                    <OptionCard
                      selected={s.id === serviceId}
                      onClick={() => {
                        if (s.id !== serviceId) setSlot((v) => ({ date: v.date, time: null }));
                        setServiceId(s.id);
                        next("service");
                      }}
                      title={s.name}
                      description={s.description}
                      meta={
                        <>
                          <span className="flex items-center gap-1.5">
                            <Clock className="size-3.5 text-gold" aria-hidden />
                            {formatDuration(s.durationMinutes)}
                          </span>
                          <span className="font-display text-2xl font-semibold text-gold-bright">{formatPrice(s.priceCents)}</span>
                        </>
                      }
                    />
                  </li>
                ))}
              </ul>
            </StepSection>
          ) : null}

          {step === "barber" ? (
            <StepSection title="Bij wie wil je zitten?" subtitle="Geen voorkeur? Dan zie je de meeste beschikbare tijden.">
              <ul className="grid gap-3 sm:grid-cols-2">
                <li>
                  <OptionCard
                    selected={barberChoice === "any"}
                    onClick={() => {
                      setBarberChoice("any");
                      next("barber");
                    }}
                    icon={<Users className="size-5" aria-hidden />}
                    title="Geen voorkeur"
                    description="We plannen je in bij de barber die op jouw moment vrij is."
                  />
                </li>
                {[...barbers]
                  .sort((a, b) => Number(b.id === favoriteBarber) - Number(a.id === favoriteBarber))
                  .map((b) => (
                    <li key={b.id}>
                      <OptionCard
                        selected={barberChoice === b.id}
                        onClick={() => {
                          if (b.id !== barberChoice) setSlot((v) => ({ date: v.date, time: null }));
                          setBarberChoice(b.id);
                          next("barber");
                        }}
                        icon={<UserRound className="size-5" aria-hidden />}
                        title={b.name}
                        description={b.bio}
                        badge={
                          b.id === favoriteBarber ? (
                            <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold">
                              <Star className="size-3 fill-gold" aria-hidden /> Je vorige barber
                            </span>
                          ) : null
                        }
                      />
                    </li>
                  ))}
              </ul>
              <StepNav onBack={() => back("barber")} />
            </StepSection>
          ) : null}

          {step === "datetime" && service ? (
            <StepSection title="Kies een dag en tijd" subtitle={`${service.name} · ${formatDuration(service.durationMinutes)}`}>
              <DateTimePicker
                query={query}
                today={today}
                lastDate={lastDate}
                value={slot}
                onChange={onSlotChange}
                refreshKey={refreshKey}
              />
              <StepNav
                onBack={() => back("datetime")}
                onNext={() => next("datetime")}
                nextDisabled={!slot.date || !slot.time}
                hint={slot.date && slot.time ? `${capitalize(formatDateLong(slot.date))} · ${slot.time}` : "Kies een tijd om verder te gaan"}
              />
            </StepSection>
          ) : null}

          {step === "details" ? (
            <DetailsStep
              initial={details}
              serverErrors={serverErrors}
              remember={remember}
              onRememberChange={setRemember}
              onBack={() => back("details")}
              onSubmit={(value) => {
                setDetails(value);
                setServerErrors({});
                next("details");
              }}
            />
          ) : null}

          {step === "confirm" && service && details && slot.date && slot.time ? (
            <StepSection title="Controleer en verstuur" subtitle="Je afspraak is pas definitief nadat wij hem hebben bevestigd.">
              <div className="lg:hidden">{summary}</div>
              <dl className="mt-6 grid gap-x-8 gap-y-4 rounded-2xl border border-line bg-surface p-6 text-sm sm:grid-cols-2">
                <SummaryRow label="Naam" value={`${details.firstName} ${details.lastName}`} />
                <SummaryRow label="Telefoon" value={details.phone} />
                <SummaryRow label="E-mail" value={details.email} />
                {details.notes ? <SummaryRow label="Opmerking" value={details.notes} /> : null}
                <button type="button" onClick={() => goTo("details")} className="text-left text-sm font-medium text-gold hover:text-gold-bright sm:col-span-2">
                  Gegevens wijzigen
                </button>
              </dl>

              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface p-5 text-sm leading-relaxed text-ink-muted">
                <Checkbox checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-0.5" />
                <span>
                  Ik ga akkoord dat RKM Barbershop mijn gegevens gebruikt om deze afspraak te plannen en mij
                  hierover te informeren. Lees de{" "}
                  <a href="/privacy" target="_blank" className="text-gold underline-offset-2 hover:underline">
                    privacyverklaring
                  </a>
                  .
                </span>
              </label>

              {/* Honeypot for bots — hidden from people and assistive technology. */}
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
              </div>

              {error ? <Alert tone="error" className="mt-6">{error}</Alert> : null}

              <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-line bg-canvas/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="ghost" onClick={() => back("confirm")} disabled={pending}>
                    <ArrowLeft className="size-4" aria-hidden /> Terug
                  </Button>
                  <Button size="lg" onClick={submit} disabled={!privacy || pending} className="w-full sm:w-auto">
                    {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                    {pending ? "Bezig met versturen…" : "Afspraak aanvragen"}
                  </Button>
                </div>
              </div>
            </StepSection>
          ) : null}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-28">{summary}</div>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function StepIndicator({ steps, current }: { steps: StepId[]; current: StepId }) {
  const index = steps.indexOf(current);
  return (
    <nav aria-label="Voortgang">
      <p className="text-sm text-ink-muted sm:hidden">
        Stap {index + 1} van {steps.length} · <span className="text-ink">{STEP_META[current].label}</span>
      </p>
      <div className="mt-3 flex gap-1.5 sm:hidden" aria-hidden>
        {steps.map((s, i) => (
          <span key={s} className={cn("h-1 flex-1 rounded-full", i <= index ? "bg-gold" : "bg-line-strong")} />
        ))}
      </div>
      <ol className="hidden items-center gap-3 sm:flex">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-3" aria-current={s === current ? "step" : undefined}>
            <span
              className={cn(
                "grid size-8 place-items-center rounded-full border text-sm font-semibold transition-colors",
                i < index && "border-gold bg-gold text-canvas",
                i === index && "border-gold text-gold",
                i > index && "border-line-strong text-ink-faint",
              )}
            >
              {i < index ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn("text-sm font-medium", i === index ? "text-ink" : "text-ink-faint")}>
              {STEP_META[s].label}
            </span>
            {i < steps.length - 1 ? <span className="h-px w-8 bg-line-strong" aria-hidden /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function StepSection({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="animate-fade-up">
      <h2 className="heading-display text-3xl sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-2 text-ink-muted">{subtitle}</p> : null}
      <div className="mt-8">{children}</div>
    </section>
  );
}

function OptionCard({
  selected,
  onClick,
  title,
  description,
  meta,
  icon,
  badge,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string | null;
  meta?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group flex h-full w-full flex-col rounded-2xl border p-5 text-left transition-all active:scale-[0.99]",
        selected ? "border-gold bg-gold/[0.07]" : "border-line bg-surface hover:border-gold/50 hover:bg-surface-2",
      )}
    >
      <span className="flex w-full items-start justify-between gap-3">
        <span className="flex items-center gap-3">
          {icon ? (
            <span className="grid size-10 place-items-center rounded-full border border-line-strong text-gold">{icon}</span>
          ) : null}
          <span className="text-lg font-semibold text-ink">{title}</span>
        </span>
        {badge}
        {selected && !badge ? <Check className="size-5 text-gold" aria-hidden /> : null}
      </span>
      {description ? <span className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</span> : null}
      {meta ? (
        <span className="mt-4 flex w-full items-end justify-between border-t border-line pt-3 text-sm text-ink-muted">{meta}</span>
      ) : null}
    </button>
  );
}

function StepNav({
  onBack,
  onNext,
  nextDisabled,
  hint,
}: {
  onBack: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-line bg-canvas/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      {hint ? <p className="mb-3 text-center text-sm text-ink-muted sm:hidden">{hint}</p> : null}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden /> Terug
        </Button>
        {onNext ? (
          <Button size="lg" onClick={onNext} disabled={nextDisabled} className="flex-1 sm:flex-none">
            Volgende <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="mt-0.5 break-words text-ink">{value}</dd>
    </div>
  );
}

function BookingSummary({
  service,
  barberLabel,
  showBarber,
  date,
  time,
}: {
  service: ServiceOption | null;
  barberLabel: string | null;
  showBarber: boolean;
  date: string | null;
  time: string | null;
}) {
  const end = service && time ? minutesToTime(timeToMinutes(time) + service.durationMinutes) : null;
  const rows: Array<[string, string | null, ReactNode]> = [
    ["Behandeling", service?.name ?? null, <Scissors key="s" className="size-4" aria-hidden />],
    ...(showBarber ? [["Barber", barberLabel, <UserRound key="b" className="size-4" aria-hidden />] as [string, string | null, ReactNode]] : []),
    [
      "Moment",
      date ? `${capitalize(formatDateLong(date))}${time ? `, ${time} – ${end}` : ""}` : null,
      <Clock key="m" className="size-4" aria-hidden />,
    ],
  ];
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <p className="eyebrow">Jouw afspraak</p>
      <ul className="mt-5 space-y-4">
        {rows.map(([label, value, icon]) => (
          <li key={label} className="flex gap-3">
            <span className={cn("mt-0.5", value ? "text-gold" : "text-ink-faint")}>{icon}</span>
            <span className="min-w-0">
              <span className="block text-xs text-ink-faint">{label}</span>
              <span className={cn("block text-sm", value ? "text-ink" : "text-ink-faint")}>{value ?? "Nog niet gekozen"}</span>
            </span>
          </li>
        ))}
      </ul>
      {service ? (
        <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
          <span className="text-sm text-ink-muted">{formatDuration(service.durationMinutes)}</span>
          <span className="font-display text-3xl font-semibold text-gold-bright">{formatPrice(service.priceCents)}</span>
        </div>
      ) : null}
    </div>
  );
}

function DetailsStep({
  initial,
  serverErrors,
  remember,
  onRememberChange,
  onBack,
  onSubmit,
}: {
  initial: Details | null;
  serverErrors: FieldErrors;
  remember: boolean;
  onRememberChange: (value: boolean) => void;
  onBack: () => void;
  onSubmit: (value: Details) => void;
}) {
  const saved = useStoredValue(STORAGE_KEYS.customer);
  const [defaults] = useState<Details>(() => {
    if (initial) return initial;
    try {
      return saved ? { ...EMPTY_DETAILS, ...(JSON.parse(saved) as Partial<Details>) } : EMPTY_DETAILS;
    } catch {
      return EMPTY_DETAILS;
    }
  });
  const [errors, setErrors] = useState<FieldErrors>(serverErrors);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const value: Details = {
      firstName: data.firstName ?? "",
      lastName: data.lastName ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      notes: data.notes ?? "",
    };
    const parsed = customerDetailsSchema.safeParse(value);
    if (!parsed.success) {
      const found = fieldErrors(parsed.error);
      setErrors(found);
      const first = Object.keys(found)[0];
      document.getElementById(first)?.focus();
      return;
    }
    onRememberChange(data.remember === "on");
    onSubmit(value);
  }

  const err = (name: keyof Details) => errors[name];
  const aria = (name: keyof Details) =>
    err(name) ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` } : {};

  return (
    <StepSection title="Je gegevens" subtitle="Zodat we je afspraak kunnen bevestigen.">
      <form noValidate onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
        <Field label="Voornaam" htmlFor="firstName" error={err("firstName")}>
          <Input id="firstName" name="firstName" autoComplete="given-name" defaultValue={defaults.firstName} required {...aria("firstName")} />
        </Field>
        <Field label="Achternaam" htmlFor="lastName" error={err("lastName")}>
          <Input id="lastName" name="lastName" autoComplete="family-name" defaultValue={defaults.lastName} required {...aria("lastName")} />
        </Field>
        <Field label="Telefoonnummer" htmlFor="phone" error={err("phone")}>
          <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="06 12345678" defaultValue={defaults.phone} required {...aria("phone")} />
        </Field>
        <Field label="E-mailadres" htmlFor="email" error={err("email")} hint="Hier sturen we de bevestiging naartoe.">
          <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="naam@voorbeeld.nl" defaultValue={defaults.email} required {...aria("email")} />
        </Field>
        <Field label="Opmerkingen (optioneel)" htmlFor="notes" error={err("notes")} className="sm:col-span-2">
          <Textarea id="notes" name="notes" maxLength={500} placeholder="Bijvoorbeeld een specifieke wens voor je kapsel" defaultValue={defaults.notes} {...aria("notes")} />
        </Field>
        <label className="flex cursor-pointer items-center gap-3 text-sm text-ink-muted sm:col-span-2">
          <Checkbox name="remember" defaultChecked={remember || Boolean(saved)} />
          Onthoud mijn gegevens op dit apparaat
        </label>
        {/* Direct grid child, so it stays stuck to the bottom while the whole form scrolls. */}
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-canvas/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:static sm:col-span-2 sm:mx-0 sm:mt-2 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="size-4" aria-hidden /> Terug
            </Button>
            <Button type="submit" size="lg" className="flex-1 sm:flex-none">
              Volgende <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </form>
    </StepSection>
  );
}
