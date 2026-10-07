"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm() {
  const [state, action] = useActionState(login, null);
  return (
    <form action={action} className="mt-7 space-y-5">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Field label="E-mailadres" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          defaultValue={state?.values?.email}
          key={state?.values?.email}
        />
      </Field>
      <Field label="Wachtwoord" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Bezig met inloggen…">
        Inloggen
      </SubmitButton>
    </form>
  );
}
