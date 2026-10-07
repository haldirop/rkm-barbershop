"use client";

import { Search, UserPlus, X } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { barberDay, findCustomers } from "@/app/admin/actions/lookup";
import type { FormState } from "@/app/admin/actions/types";
import { Alert } from "@/components/ui/alert";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { STATUS_META } from "@/lib/status";
import { minutesToTime, timeToMinutes } from "@/lib/time";

interface Option {
  id: string;
  name: string;
}

interface ServiceOption extends Option {
  durationMinutes: number;
  priceCents: number;
}

export interface AppointmentFormValues {
  id?: string;
  serviceId: string;
  barberId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  priceCents: number;
  notes: string;
  adminNotes: string;
  status?: string;
  hasEmail?: boolean;
}

type CustomerMatch = Awaited<ReturnType<typeof findCustomers>>[number];
type DayItem = Awaited<ReturnType<typeof barberDay>>[number];

export function AppointmentForm({
  mode,
  action,
  services,
  barbers,
  initial,
  initialCustomer = null,
}: {
  mode: "new" | "edit";
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  services: ServiceOption[];
  barbers: Option[];
  initial: AppointmentFormValues;
  initialCustomer?: CustomerMatch | null;
}) {
  const [state, formAction] = useActionState(action, null);
  const [serviceId, setServiceId] = useState(initial.serviceId);
  const [barberId, setBarberId] = useState(initial.barberId);
  const [date, setDate] = useState(initial.date);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [duration, setDuration] = useState(initial.durationMinutes);
  const [price, setPrice] = useState((initial.priceCents / 100).toFixed(2).replace(".", ","));
  const [dayItems, setDayItems] = useState<DayItem[] | null>(null);
  const errors = state?.fieldErrors ?? {};

  // Load what's already planned for this barber on this day.
  useEffect(() => {
    if (!barberId || !date) return;
    let cancelled = false;
    barberDay(barberId, date, initial.id).then((items) => {
      if (!cancelled) setDayItems(items);
    });
    return () => {
      cancelled = true;
    };
  }, [barberId, date, initial.id]);

  function onServiceChange(id: string) {
    setServiceId(id);
    const service = services.find((s) => s.id === id);
    if (service) {
      setDuration(service.durationMinutes);
      setPrice((service.priceCents / 100).toFixed(2).replace(".", ","));
    }
  }

  const start = /^\d{2}:\d{2}$/.test(startTime) ? timeToMinutes(startTime) : null;
  const end = start !== null ? start + duration : null;
  const conflicts =
    start !== null && end !== null
      ? (dayItems ?? []).filter((d) => timeToMinutes(d.start) < end && timeToMinutes(d.end) > start)
      : [];

  return (
    <form action={formAction} className="space-y-6">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}

      {mode === "new" ? <CustomerFields errors={errors} initial={initialCustomer} /> : null}

      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="mb-5 text-base font-semibold text-ink">Afspraak</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Behandeling" htmlFor="serviceId" error={errors.serviceId}>
            <Select id="serviceId" name="serviceId" value={serviceId} onChange={(e) => onServiceChange(e.target.value)} required>
              <option value="">Kies een behandeling</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Barber" htmlFor="barberId" error={errors.barberId}>
            <Select id="barberId" name="barberId" value={barberId} onChange={(e) => setBarberId(e.target.value)} required>
              <option value="">Kies een barber</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Datum" htmlFor="date" error={errors.date}>
            <Input id="date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Starttijd" htmlFor="startTime" error={errors.startTime} hint={end !== null && end <= 1440 ? `Eindigt om ${minutesToTime(end)}` : undefined}>
            <Input id="startTime" name="startTime" type="time" step={300} value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </Field>
          <Field label="Duur (minuten)" htmlFor="durationMinutes" error={errors.durationMinutes}>
            <Input
              id="durationMinutes"
              name="durationMinutes"
              type="number"
              min={5}
              max={480}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              required
            />
          </Field>
          <Field label="Prijs (€)" htmlFor="price" error={errors.price}>
            <Input id="price" name="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </Field>
        </div>

        {dayItems ? (
          <div className="mt-6 rounded-xl border border-line bg-surface-2 p-4">
            <p className="text-sm font-medium text-ink">Al gepland bij deze barber op deze dag</p>
            {dayItems.length ? (
              <ul className="mt-3 space-y-1.5 text-sm">
                {dayItems.map((d) => {
                  const clash = conflicts.some((c) => c.id === d.id);
                  return (
                    <li key={d.id} className={cn("flex items-center gap-3", clash ? "text-red-300" : "text-ink-muted")}>
                      <span className={cn("size-2 rounded-full", STATUS_META[d.status].dot)} aria-hidden />
                      <span className="w-28 tabular-nums">
                        {d.start} – {d.end}
                      </span>
                      <span className="truncate">
                        {d.name} · {d.service}
                      </span>
                      {clash ? <span className="ml-auto text-xs font-semibold">Overlapt</span> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-ink-muted">Nog niets gepland.</p>
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="mb-5 text-base font-semibold text-ink">Notities</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Opmerking klant" htmlFor="notes" error={errors.notes}>
            <Textarea id="notes" name="notes" maxLength={500} defaultValue={initial.notes} />
          </Field>
          <Field label="Interne notitie" htmlFor="adminNotes" error={errors.adminNotes} hint="Alleen zichtbaar in het beheer.">
            <Textarea id="adminNotes" name="adminNotes" maxLength={500} defaultValue={initial.adminNotes} />
          </Field>
        </div>
      </section>

      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        {mode === "new" ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <Field label="Status" htmlFor="status" className="sm:w-48">
              <Select id="status" name="status" defaultValue="APPROVED">
                <option value="APPROVED">Direct bevestigd</option>
                <option value="PENDING">Als aanvraag</option>
              </Select>
            </Field>
            <label className="flex items-center gap-3 text-sm text-ink-muted sm:mt-6">
              <Checkbox name="notify" defaultChecked /> Bevestiging mailen (als e-mail bekend is)
            </label>
          </div>
        ) : initial.status === "APPROVED" && initial.hasEmail ? (
          <label className="flex items-center gap-3 text-sm text-ink-muted">
            <Checkbox name="notify" defaultChecked /> Klant mailen als datum, tijd of barber wijzigt
          </label>
        ) : (
          <span />
        )}
        <SubmitButton size="lg" pendingText="Opslaan…" disabled={conflicts.length > 0}>
          {mode === "new" ? "Afspraak inplannen" : "Wijzigingen opslaan"}
        </SubmitButton>
      </div>
      {conflicts.length ? (
        <p className="text-right text-sm text-red-300">Kies een ander tijdstip: dit overlapt met een bestaande afspraak.</p>
      ) : null}
    </form>
  );
}

function CustomerFields({
  errors,
  initial,
}: {
  errors: Partial<Record<string, string>>;
  initial: CustomerMatch | null;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<CustomerMatch[]>([]);
  const [selected, setSelected] = useState<CustomerMatch | null>(initial);
  const [, startTransition] = useTransition();

  function search(value: string) {
    setQuery(value);
    if (value.trim().length < 2) return setMatches([]);
    startTransition(async () => setMatches(await findCustomers(value)));
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="mb-5 text-base font-semibold text-ink">Klant</h2>
      <input type="hidden" name="customerId" value={selected?.id ?? ""} />

      {selected ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
          <div className="text-sm">
            <p className="font-medium text-ink">
              {selected.firstName} {selected.lastName}
            </p>
            <p className="text-ink-muted">
              {selected.phone}
              {selected.email ? ` · ${selected.email}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="grid size-9 place-items-center rounded-full text-ink-muted hover:bg-surface-3 hover:text-ink"
            aria-label="Andere klant kiezen"
          >
            <X className="size-4" />
          </button>
          {/* Existing customer: the server keeps their stored details. */}
          <input type="hidden" name="firstName" value={selected.firstName} />
          <input type="hidden" name="lastName" value={selected.lastName} />
          <input type="hidden" name="phone" value={selected.phone} />
          <input type="hidden" name="email" value={selected.email ?? ""} />
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <Input
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="Zoek bestaande klant op naam, telefoon of e-mail"
              aria-label="Bestaande klant zoeken"
              className="pl-11"
            />
          </div>
          {matches.length ? (
            <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line">
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(m);
                      setMatches([]);
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-surface-2"
                  >
                    <span className="font-medium text-ink">
                      {m.firstName} {m.lastName}
                    </span>
                    <span className="text-ink-muted"> · {m.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-5 mb-4 flex items-center gap-2 text-sm text-ink-muted">
            <UserPlus className="size-4 text-gold" aria-hidden /> Of vul de gegevens van een nieuwe klant in:
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Voornaam" htmlFor="firstName" error={errors.firstName}>
              <Input id="firstName" name="firstName" autoComplete="off" />
            </Field>
            <Field label="Achternaam" htmlFor="lastName" error={errors.lastName}>
              <Input id="lastName" name="lastName" autoComplete="off" />
            </Field>
            <Field label="Telefoon" htmlFor="phone" error={errors.phone}>
              <Input id="phone" name="phone" type="tel" autoComplete="off" />
            </Field>
            <Field label="E-mail (optioneel)" htmlFor="email" error={errors.email}>
              <Input id="email" name="email" type="email" autoComplete="off" />
            </Field>
          </div>
        </>
      )}
    </section>
  );
}
