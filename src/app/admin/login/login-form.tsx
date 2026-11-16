"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { login } from "@/app/admin/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm({ returnTo, canReset }: { returnTo?: string | null; canReset?: boolean }) {
  const [state, action] = useActionState(login, null);
  const lockSeconds = state?.retryAfterSeconds;
  return (
    <form action={action} className="mt-7 space-y-5">
      {returnTo ? <input type="hidden" name="naar" value={returnTo} /> : null}
      {lockSeconds ? (
        // Remounts for every new answer from the server, so the countdown starts afresh.
        <Locked
          key={`${lockSeconds}:${state?.error}`}
          seconds={lockSeconds}
          message={state?.error}
          email={state?.values?.email}
          canReset={canReset}
        />
      ) : (
        <>
          {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
          <LoginFields email={state?.values?.email} />
          <SubmitButton size="lg" className="w-full" pendingText="Bezig met inloggen…">
            Inloggen
          </SubmitButton>
        </>
      )}
    </form>
  );
}

function LoginFields({ email, disabled }: { email?: string; disabled?: boolean }) {
  return (
    <>
      <Field label="E-mailadres" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          defaultValue={email}
          key={email}
        />
      </Field>
      <Field label="Wachtwoord" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required disabled={disabled} />
      </Field>
    </>
  );
}

/**
 * Too many wrong passwords: shows until when logging in is blocked, counts down, and opens
 * the form again by itself once the time is up.
 */
function Locked({
  seconds,
  message,
  email,
  canReset,
}: {
  seconds: number;
  message?: string;
  email?: string;
  canReset?: boolean;
}) {
  const [deadline] = useState(() => Date.now() + seconds * 1000);
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  const done = left === 0;
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <>
      {done ? (
        <Alert tone="success">Je kunt weer inloggen.</Alert>
      ) : (
        <Alert tone="error" title={message}>
          <p>
            Nog <strong className="tabular-nums">{clock}</strong>. Tot die tijd wordt ook het juiste wachtwoord geweigerd; opnieuw
            proberen verlengt de wachttijd niet.
          </p>
          {canReset ? (
            <p className="mt-2">
              Kun je niet wachten?{" "}
              <Link href="/admin/wachtwoord-vergeten" className="underline underline-offset-2">
                Kies via een e-maillink een nieuw wachtwoord
              </Link>
              ; daarmee ben je meteen weer binnen.
            </p>
          ) : null}
        </Alert>
      )}
      <LoginFields email={email} disabled={!done} />
      <SubmitButton size="lg" className="w-full" pendingText="Bezig met inloggen…" disabled={!done}>
        {done ? "Inloggen" : `Inloggen kan over ${clock}`}
      </SubmitButton>
    </>
  );
}
