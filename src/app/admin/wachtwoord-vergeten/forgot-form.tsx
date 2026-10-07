"use client";

import { useActionState } from "react";
import { forgotPassword } from "@/app/admin/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPassword, null);
  if (state?.ok) return <Alert tone="success" className="mt-6">{state.message}</Alert>;
  return (
    <form action={action} className="mt-7 space-y-5">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Field label="E-mailadres" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Versturen…">
        Stuur mij een link
      </SubmitButton>
    </form>
  );
}
