"use client";

import { useActionState, useState } from "react";
import { addBlockAction, addBreakAction, saveHoursAction } from "@/app/admin/actions/schedule";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { capitalize, weekdayName, weekdayShort } from "@/lib/format";
import { FormError, useActionFeedback } from "./form-helpers";

interface Day {
  weekday: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface BarberOption {
  id: string;
  name: string;
}

export function HoursForm({ days }: { days: Day[] }) {
  const [state, action] = useActionState(saveHoursAction, null);
  useActionFeedback(state);
  const errors = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <div className="divide-y divide-line rounded-xl border border-line">
        {days.map((d) => (
          <div key={d.weekday} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <label className="flex w-40 items-center gap-3 text-[15px] text-ink">
              <Checkbox name={`open_${d.weekday}`} defaultChecked={d.isOpen} />
              {capitalize(weekdayName(d.weekday))}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                name={`from_${d.weekday}`}
                defaultValue={d.openTime.slice(0, 5)}
                aria-label={`Opening ${weekdayName(d.weekday)}`}
                className="h-10 w-28 px-3"
              />
              <span className="text-ink-faint">–</span>
              <Input
                type="time"
                name={`to_${d.weekday}`}
                defaultValue={d.closeTime.slice(0, 5)}
                aria-label={`Sluiting ${weekdayName(d.weekday)}`}
                className="h-10 w-28 px-3"
              />
            </div>
            {errors[`day_${d.weekday}`] ? (
              <p className="w-full text-sm text-red-300">{errors[`day_${d.weekday}`]}</p>
            ) : null}
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-faint">Vink een dag uit om die als ‘Gesloten’ te tonen.</p>
      <div className="flex justify-end">
        <SubmitButton pendingText="Opslaan…">Openingstijden opslaan</SubmitButton>
      </div>
    </form>
  );
}

export function BreakForm({ barbers }: { barbers: BarberOption[] }) {
  const [state, action] = useActionState(addBreakAction, null);
  const formRef = useActionFeedback(state, { resetForm: true });
  const errors = state?.fieldErrors ?? {};
  return (
    <form ref={formRef} action={action} className="space-y-4">
      <FormError state={state} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-muted">Dagen</legend>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <label
              key={d}
              className="flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-3.5 text-sm text-ink has-[:checked]:border-gold has-[:checked]:bg-gold/10"
            >
              <input type="checkbox" name="weekday" value={d} className="accent-[var(--color-gold)]" defaultChecked={d <= 6} />
              {capitalize(weekdayShort(d))}
            </label>
          ))}
        </div>
        {errors.weekday ? <p className="mt-1.5 text-sm text-red-300">{errors.weekday}</p> : null}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Van" htmlFor="break-start" error={errors.startTime}>
          <Input id="break-start" name="startTime" type="time" defaultValue="13:00" required />
        </Field>
        <Field label="Tot" htmlFor="break-end" error={errors.endTime}>
          <Input id="break-end" name="endTime" type="time" defaultValue="13:30" required />
        </Field>
        <Field label="Voor" htmlFor="break-barber">
          <Select id="break-barber" name="barberId" defaultValue="">
            <option value="">Hele zaak</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Omschrijving" htmlFor="break-label">
          <Input id="break-label" name="label" placeholder="Lunchpauze" maxLength={80} />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingText="Toevoegen…">Pauze toevoegen</SubmitButton>
      </div>
    </form>
  );
}

export function BlockForm({ barbers, today }: { barbers: BarberOption[]; today: string }) {
  const [state, action] = useActionState(addBlockAction, null);
  const formRef = useActionFeedback(state, { resetForm: true });
  const [allDay, setAllDay] = useState(true);
  const errors = state?.fieldErrors ?? {};
  return (
    <form ref={formRef} action={action} onReset={() => setAllDay(true)} className="space-y-4">
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vanaf datum" htmlFor="block-start" error={errors.startDate}>
          <Input id="block-start" name="startDate" type="date" min={today} defaultValue={today} required />
        </Field>
        <Field label="Tot en met (optioneel)" htmlFor="block-end" error={errors.endDate} hint="Leeg = alleen die ene dag.">
          <Input id="block-end" name="endDate" type="date" min={today} />
        </Field>
      </div>
      <label className="flex items-center gap-3 text-sm text-ink">
        <Checkbox name="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
        Hele dag
      </label>
      {!allDay ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Van" htmlFor="block-from" error={errors.startTime}>
            <Input id="block-from" name="startTime" type="time" defaultValue="15:00" required />
          </Field>
          <Field label="Tot" htmlFor="block-to" error={errors.endTime}>
            <Input id="block-to" name="endTime" type="time" defaultValue="17:00" required />
          </Field>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Voor" htmlFor="block-barber">
          <Select id="block-barber" name="barberId" defaultValue="">
            <option value="">Hele zaak</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reden (intern)" htmlFor="block-reason">
          <Input id="block-reason" name="reason" placeholder="Bijv. vakantie of training" maxLength={80} />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingText="Toevoegen…">Blokkade toevoegen</SubmitButton>
      </div>
    </form>
  );
}
