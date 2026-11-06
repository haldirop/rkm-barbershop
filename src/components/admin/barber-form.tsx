"use client";

import { useActionState } from "react";
import { deleteBarberAction, saveBarberAction } from "@/app/admin/actions/catalog";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { MAX_EXPERIENCE_YEARS, currentYear, experienceYears } from "@/lib/barber-profile";
import { capitalize, weekdayName } from "@/lib/format";
import { DeleteButton, FormError, useActionFeedback } from "./form-helpers";
import { TranslationFields } from "./translation-fields";

export interface BarberValues {
  id: string;
  name: string;
  bio: string | null;
  bioEn: string | null;
  bioDe: string | null;
  role: string | null;
  roleEn: string | null;
  roleDe: string | null;
  intro: string | null;
  introEn: string | null;
  introDe: string | null;
  experienceSince: number | null;
  isCertified: boolean;
  isOwner: boolean;
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
  const years = experienceYears(barber?.experienceSince ?? null, currentYear());
  const translated = Boolean(
    barber?.bioEn || barber?.bioDe || barber?.roleEn || barber?.roleDe || barber?.introEn || barber?.introDe,
  );

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <input type="hidden" name="id" value={barber?.id ?? ""} />
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Naam" htmlFor={`name-${key}`} error={errors.name}>
          <Input id={`name-${key}`} name="name" defaultValue={barber?.name} required maxLength={40} />
        </Field>
        <Field label="Functie" htmlFor={`role-${key}`} error={errors.role} hint="Bijvoorbeeld: Eigenaar & barber. Leeg: Barber.">
          <Input id={`role-${key}`} name="role" defaultValue={barber?.role ?? ""} maxLength={40} placeholder="Barber" />
        </Field>
      </div>
      <Field label="Korte omschrijving" htmlFor={`bio-${key}`} error={errors.bio} hint="Zichtbaar bij het team op de homepage en bij het kiezen van een barber.">
        <Input id={`bio-${key}`} name="bio" defaultValue={barber?.bio ?? ""} maxLength={160} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[13rem_1fr]">
        <Field
          label="Jaren ervaring"
          htmlFor={`experience-${key}`}
          error={errors.experienceYears}
          hint="Telt elk jaar vanzelf op. Leeg: niet tonen."
        >
          <Input
            id={`experience-${key}`}
            name="experienceYears"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_EXPERIENCE_YEARS}
            step={1}
            defaultValue={years ?? ""}
          />
        </Field>
        <div className="space-y-3 sm:pt-8">
          <label className="flex items-center gap-3 text-sm text-ink">
            <Checkbox name="isCertified" defaultChecked={barber?.isCertified ?? false} /> Gecertificeerd barber
          </label>
          <label className="flex items-start gap-3 text-sm text-ink">
            <Checkbox name="isOwner" defaultChecked={barber?.isOwner ?? false} className="mt-px" />
            <span>
              Eigenaar van de zaak
              <span className="block text-xs text-ink-faint">Staat groot op de homepage, in het blok Maak kennis met …</span>
            </span>
          </label>
        </div>
      </div>

      <Field
        label="Introductie op de homepage"
        htmlFor={`intro-${key}`}
        error={errors.intro}
        hint="Voor de eigenaar: de tekst in het blok Maak kennis met … Een nieuwe regel begint een nieuwe alinea. Leeg: een korte standaardzin."
      >
        <Textarea id={`intro-${key}`} name="intro" defaultValue={barber?.intro ?? ""} maxLength={800} rows={4} />
      </Field>

      <TranslationFields filled={translated}>
        <Field label="Functie (Engels)" htmlFor={`roleEn-${key}`} error={errors.roleEn}>
          <Input id={`roleEn-${key}`} name="roleEn" defaultValue={barber?.roleEn ?? ""} maxLength={40} />
        </Field>
        <Field label="Functie (Duits)" htmlFor={`roleDe-${key}`} error={errors.roleDe}>
          <Input id={`roleDe-${key}`} name="roleDe" defaultValue={barber?.roleDe ?? ""} maxLength={40} />
        </Field>
        <Field label="Korte omschrijving (Engels)" htmlFor={`bioEn-${key}`} error={errors.bioEn}>
          <Input id={`bioEn-${key}`} name="bioEn" defaultValue={barber?.bioEn ?? ""} maxLength={160} />
        </Field>
        <Field label="Korte omschrijving (Duits)" htmlFor={`bioDe-${key}`} error={errors.bioDe}>
          <Input id={`bioDe-${key}`} name="bioDe" defaultValue={barber?.bioDe ?? ""} maxLength={160} />
        </Field>
        <Field label="Introductie (Engels)" htmlFor={`introEn-${key}`} error={errors.introEn}>
          <Textarea id={`introEn-${key}`} name="introEn" defaultValue={barber?.introEn ?? ""} maxLength={800} rows={4} />
        </Field>
        <Field label="Introductie (Duits)" htmlFor={`introDe-${key}`} error={errors.introDe}>
          <Textarea id={`introDe-${key}`} name="introDe" defaultValue={barber?.introDe ?? ""} maxLength={800} rows={4} />
        </Field>
      </TranslationFields>

      <fieldset className="min-w-0">
        <legend className="mb-3 text-sm font-medium text-ink-muted">Werkdagen en werktijden</legend>
        <div className="divide-y divide-line rounded-xl border border-line">
          {hours.map((h) => (
            <div key={h.weekday} className="grid gap-2 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-3 sm:py-2.5">
              <label className="flex items-center gap-3 text-sm text-ink">
                <Checkbox name={`work_${h.weekday}`} defaultChecked={h.isWorking} />
                {capitalize(weekdayName(h.weekday))}
              </label>
              <div className="flex flex-wrap items-center gap-2">
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
