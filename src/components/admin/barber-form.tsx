"use client";

import { useActionState } from "react";
import { deleteBarberAction, saveBarberAction } from "@/app/admin/actions/catalog";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { capitalize, weekdayName } from "@/lib/format";
import { DeleteButton, FormError, useActionFeedback } from "./form-helpers";

export interface BarberValues {
  id: string;
  name: string;
  bio: string | null;
  isActive: boolean;
  sortOrder: number;
  hours: Array<{ weekday: number; isWorking: boolean; startTime: string; endTime: string }>;
}

const DEFAULT_HOURS = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  isWorking: weekday <= 6,
  startTime: "09:00",
  endTime: "18:00",
}));

export function BarberForm({ barber }: { barber?: BarberValues }) {
  const [state, action] = useActionState(saveBarberAction, null);
  const formRef = useActionFeedback(state, { resetForm: !barber });
  const errors = state?.fieldErrors ?? {};
  const key = barber?.id ?? "new";
  const hours = DEFAULT_HOURS.map((d) => barber?.hours.find((h) => h.weekday === d.weekday) ?? d);

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <input type="hidden" name="id" value={barber?.id ?? ""} />
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <Field label="Naam" htmlFor={`name-${key}`} error={errors.name}>
          <Input id={`name-${key}`} name="name" defaultValue={barber?.name} required maxLength={40} />
        </Field>
        <Field label="Korte omschrijving" htmlFor={`bio-${key}`} error={errors.bio} hint="Zichtbaar bij het kiezen van een barber.">
          <Input id={`bio-${key}`} name="bio" defaultValue={barber?.bio ?? ""} maxLength={160} />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-3 text-sm font-medium text-ink-muted">Werkdagen en werktijden</legend>
        <div className="divide-y divide-line rounded-xl border border-line">
          {hours.map((h) => (
            <div key={h.weekday} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 sm:grid-cols-[10rem_1fr]">
              <label className="flex items-center gap-3 text-sm text-ink">
                <Checkbox name={`work_${h.weekday}`} defaultChecked={h.isWorking} />
                {capitalize(weekdayName(h.weekday))}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  name={`start_${h.weekday}`}
                  defaultValue={h.startTime.slice(0, 5)}
                  aria-label={`Begintijd ${weekdayName(h.weekday)}`}
                  className="h-10 w-28 px-3"
                />
                <span className="text-ink-faint">–</span>
                <Input
                  type="time"
                  name={`end_${h.weekday}`}
                  defaultValue={h.endTime.slice(0, 5)}
                  aria-label={`Eindtijd ${weekdayName(h.weekday)}`}
                  className="h-10 w-28 px-3"
                />
                {errors[`hours_${h.weekday}`] ? (
                  <span className="text-xs text-red-300">{errors[`hours_${h.weekday}`]}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Een barber is alleen boekbaar binnen zowel de eigen werktijden als de openingstijden van de zaak.
        </p>
      </fieldset>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-6">
          <Field label="Volgorde" htmlFor={`sort-${key}`} className="w-24">
            <Input id={`sort-${key}`} name="sortOrder" type="number" min={0} max={999} defaultValue={barber?.sortOrder ?? 0} />
          </Field>
          <label className="flex h-12 items-center gap-3 text-sm text-ink-muted">
            <Checkbox name="isActive" defaultChecked={barber?.isActive ?? true} /> Actief (online boekbaar)
          </label>
        </div>
        <div className="flex gap-2">
          {barber ? (
            <DeleteButton
              action={() => deleteBarberAction(barber.id)}
              title={`${barber.name} verwijderen?`}
              description="Afspraken uit het verleden blijven bewaard. Tijdelijk afwezig? Zet de barber liever op inactief."
            />
          ) : null}
          <SubmitButton pendingText="Opslaan…">{barber ? "Opslaan" : "Barber toevoegen"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
