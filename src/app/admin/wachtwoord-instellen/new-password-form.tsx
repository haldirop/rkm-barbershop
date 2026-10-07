"use client";

import { useActionState } from "react";
import { chooseNewPassword } from "@/app/admin/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function NewPasswordForm() {
  const [state, action] = useActionState(chooseNewPassword, null);
  const errors = state?.fieldErrors ?? {};
  return (
    <form action={action} className="mt-7 space-y-5">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Field label="Nieuw wachtwoord" htmlFor="next" error={errors.next} hint="Minimaal 10 tekens, letters en cijfers.">
        <Input id="next" name="next" type="password" autoComplete="new-password" required autoFocus />
      </Field>
      <Field label="Herhaal nieuw wachtwoord" htmlFor="repeat" error={errors.repeat}>
        <Input id="repeat" name="repeat" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Opslaan…">
        Wachtwoord opslaan
      </SubmitButton>
    </form>
  );
}
