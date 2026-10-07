"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useActionState, useTransition } from "react";
import { changePassword } from "@/app/admin/actions/auth";
import {
  addUserAction,
  deleteUserAction,
  removeDemoDataAction,
  saveBusinessAction,
  saveRulesAction,
  sendTestEmailAction,
} from "@/app/admin/actions/content";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { toast } from "@/components/ui/toast";
import type { Settings } from "@/server/db/schema";
import { DeleteButton, FormError, useActionFeedback } from "./form-helpers";

export function BusinessForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState(saveBusinessAction, null);
  useActionFeedback(state);
  const e = state?.fieldErrors ?? {};
  const field = (name: keyof Settings, label: string, props: React.ComponentProps<typeof Input> = {}, hint?: string) => (
    <Field label={label} htmlFor={name} error={e[name]} hint={hint}>
      <Input id={name} name={name} defaultValue={(settings[name] as string | null) ?? ""} {...props} />
    </Field>
  );
  return (
    <form action={action} className="space-y-5">
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        {field("businessName", "Bedrijfsnaam", { required: true })}
        {field("tagline", "Slogan")}
        {field("phone", "Telefoonnummer", { type: "tel", required: true })}
        {field("email", "E-mailadres (publiek)", { type: "email", required: true })}
        {field("street", "Straat en huisnummer", { required: true })}
        <div className="grid grid-cols-[1fr_1.5fr] gap-4">
          {field("postalCode", "Postcode", { required: true })}
          {field("city", "Plaats", { required: true })}
        </div>
        {field("kvkNumber", "KvK-nummer (optioneel)")}
        {field(
          "notificationEmail",
          "E-mail voor meldingen",
          { type: "email" },
          "Hier komen nieuwe aanvragen binnen. Leeg = publiek e-mailadres.",
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {field("instagramUrl", "Instagram-link", { placeholder: "https://instagram.com/…" })}
        {field("facebookUrl", "Facebook-link", { placeholder: "https://facebook.com/…" })}
        {field("googleReviewsUrl", "Google-reviewlink", { placeholder: "https://g.page/…" })}
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingText="Opslaan…">Bedrijfsgegevens opslaan</SubmitButton>
      </div>
    </form>
  );
}

export function RulesForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState(saveRulesAction, null);
  useActionFeedback(state);
  const e = state?.fieldErrors ?? {};
  const num = (name: keyof Settings, label: string, hint: string, max: number) => (
    <Field label={label} htmlFor={name} error={e[name]} hint={hint}>
      <Input id={name} name={name} type="number" min={0} max={max} defaultValue={settings[name] as number} required />
    </Field>
  );
  return (
    <form action={action} className="space-y-5">
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Tijdsblokken" htmlFor="slotIntervalMinutes" error={e.slotIntervalMinutes} hint="Om de hoeveel minuten een starttijd wordt aangeboden.">
          <Select id="slotIntervalMinutes" name="slotIntervalMinutes" defaultValue={String(settings.slotIntervalMinutes)}>
            {[5, 10, 15, 20, 30, 60].map((n) => (
              <option key={n} value={n}>
                Elke {n} minuten
              </option>
            ))}
          </Select>
        </Field>
        {num("bufferMinutes", "Buffer tussen afspraken (min)", "Extra tijd om op te ruimen tussen klanten.", 60)}
        {num("minLeadMinutes", "Minimaal vooraf boeken (min)", "Bijv. 60 = niet later dan een uur van tevoren.", 2880)}
        {num("bookingHorizonDays", "Maximaal vooruit boeken (dagen)", "Hoe ver vooruit klanten kunnen plannen.", 365)}
        {num("cancellationCutoffHours", "Annuleren/verplaatsen tot (uur)", "Tot hoeveel uur voor de afspraak klanten zelf kunnen wijzigen.", 168)}
        <Field
          label="Herinnering versturen vanaf"
          htmlFor="reminderSendTime"
          error={e.reminderSendTime}
          hint="Klanten krijgen de dag voor hun afspraak een herinnering."
        >
          <Input id="reminderSendTime" name="reminderSendTime" type="time" defaultValue={settings.reminderSendTime.slice(0, 5)} required />
        </Field>
        {num("maxOpenAppointmentsPerCustomer", "Max. openstaande afspraken per klant", "Voorkomt misbruik.", 20)}
      </div>
      <label className="flex items-center gap-3 text-sm text-ink-muted">
        <Checkbox name="remindersEnabled" defaultChecked={settings.remindersEnabled} /> Herinneringsmails versturen
      </label>
      <div className="flex justify-end">
        <SubmitButton pendingText="Opslaan…">Boekingsregels opslaan</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, null);
  const formRef = useActionFeedback(state, { resetForm: true });
  const e = state?.fieldErrors ?? {};
  return (
    <form ref={formRef} action={action} className="space-y-4">
      <FormError state={state} />
      <Field label="Huidig wachtwoord" htmlFor="current" error={e.current}>
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nieuw wachtwoord" htmlFor="next" error={e.next} hint="Minimaal 10 tekens, letters en cijfers.">
          <Input id="next" name="next" type="password" autoComplete="new-password" required />
        </Field>
        <Field label="Herhaal nieuw wachtwoord" htmlFor="repeat" error={e.repeat}>
          <Input id="repeat" name="repeat" type="password" autoComplete="new-password" required />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingText="Wijzigen…">Wachtwoord wijzigen</SubmitButton>
      </div>
    </form>
  );
}

export function AddUserForm() {
  const [state, action] = useActionState(addUserAction, null);
  const formRef = useActionFeedback(state, { resetForm: true });
  const e = state?.fieldErrors ?? {};
  return (
    <form ref={formRef} action={action} className="space-y-4">
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Naam" htmlFor="new-user-name" error={e.name}>
          <Input id="new-user-name" name="name" required autoComplete="off" />
        </Field>
        <Field label="E-mail" htmlFor="new-user-email" error={e.email}>
          <Input id="new-user-email" name="email" type="email" required autoComplete="off" />
        </Field>
        <Field label="Tijdelijk wachtwoord" htmlFor="new-user-password" error={e.password}>
          <Input id="new-user-password" name="password" type="password" required autoComplete="new-password" />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingText="Toevoegen…">Beheerder toevoegen</SubmitButton>
      </div>
    </form>
  );
}

export function DeleteUserButton({ id, name }: { id: string; name: string }) {
  return (
    <DeleteButton
      compact
      action={() => deleteUserAction(id)}
      title={`${name} verwijderen?`}
      description="Deze persoon kan daarna niet meer inloggen in het beheer."
    />
  );
}

export function TestEmailButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await sendTestEmailAction();
          if (result.ok) toast.success(result.message);
          else toast.error(result.error);
        })
      }
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
      Testmail versturen
    </Button>
  );
}

export function RemoveDemoButton() {
  return (
    <DeleteButton
      action={removeDemoDataAction}
      label="Demodata verwijderen"
      title="Alle demodata verwijderen?"
      description="Alle voorbeeldklanten, voorbeeldafspraken en voorbeeldreviews worden verwijderd. Echte gegevens blijven staan."
    />
  );
}
