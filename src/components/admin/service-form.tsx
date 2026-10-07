"use client";

import { useActionState } from "react";
import { deleteServiceAction, saveServiceAction } from "@/app/admin/actions/catalog";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { DeleteButton, FormError, useActionFeedback } from "./form-helpers";

export interface ServiceValues {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  durationMinutes: number;
  isActive: boolean;
  sortOrder: number;
}

export function ServiceForm({ service }: { service?: ServiceValues }) {
  const [state, action] = useActionState(saveServiceAction, null);
  const formRef = useActionFeedback(state, { resetForm: !service });
  const errors = state?.fieldErrors ?? {};
  const key = service?.id ?? "new";

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <input type="hidden" name="id" value={service?.id ?? ""} />
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <Field label="Naam" htmlFor={`name-${key}`} error={errors.name}>
          <Input id={`name-${key}`} name="name" defaultValue={service?.name} required maxLength={60} />
        </Field>
        <Field label="Prijs (€)" htmlFor={`price-${key}`} error={errors.price}>
          <Input
            id={`price-${key}`}
            name="price"
            inputMode="decimal"
            defaultValue={service ? (service.priceCents / 100).toFixed(2).replace(".", ",") : ""}
            placeholder="25,00"
            required
          />
        </Field>
        <Field label="Duur (min)" htmlFor={`duration-${key}`} error={errors.durationMinutes}>
          <Input
            id={`duration-${key}`}
            name="durationMinutes"
            type="number"
            min={5}
            max={480}
            step={5}
            defaultValue={service?.durationMinutes ?? 30}
            required
          />
        </Field>
      </div>
      <Field label="Omschrijving" htmlFor={`description-${key}`} error={errors.description} hint="Wordt getoond op de website en bij het boeken.">
        <Textarea id={`description-${key}`} name="description" maxLength={300} defaultValue={service?.description ?? ""} className="min-h-20" />
      </Field>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-6">
          <Field label="Volgorde" htmlFor={`sort-${key}`} className="w-24">
            <Input id={`sort-${key}`} name="sortOrder" type="number" min={0} max={999} defaultValue={service?.sortOrder ?? 0} />
          </Field>
          <label className="flex h-12 items-center gap-3 text-sm text-ink-muted">
            <Checkbox name="isActive" defaultChecked={service?.isActive ?? true} /> Online boekbaar
          </label>
        </div>
        <div className="flex gap-2">
          {service ? (
            <DeleteButton
              action={() => deleteServiceAction(service.id)}
              title={`${service.name} verwijderen?`}
              description="Bestaande afspraken behouden hun gegevens. Liever tijdelijk verbergen? Zet ‘Online boekbaar’ uit."
            />
          ) : null}
          <SubmitButton pendingText="Opslaan…">{service ? "Opslaan" : "Dienst toevoegen"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
