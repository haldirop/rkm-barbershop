"use client";

import { useActionState } from "react";
import { deleteCustomerAction, saveCustomerAction } from "@/app/admin/actions/customers";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { DeleteButton, FormError, useActionFeedback } from "./form-helpers";

export function CustomerForm({
  customer,
}: {
  customer: { id: string; firstName: string; lastName: string; phone: string; email: string | null; adminNotes: string | null };
}) {
  const [state, action] = useActionState(saveCustomerAction, null);
  useActionFeedback(state);
  const errors = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={customer.id} />
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Voornaam" htmlFor="firstName" error={errors.firstName}>
          <Input id="firstName" name="firstName" defaultValue={customer.firstName} required />
        </Field>
        <Field label="Achternaam" htmlFor="lastName" error={errors.lastName}>
          <Input id="lastName" name="lastName" defaultValue={customer.lastName} required />
        </Field>
        <Field label="Telefoon" htmlFor="phone" error={errors.phone}>
          <Input id="phone" name="phone" type="tel" defaultValue={customer.phone} required />
        </Field>
        <Field label="E-mail" htmlFor="email" error={errors.email}>
          <Input id="email" name="email" type="email" defaultValue={customer.email ?? ""} />
        </Field>
      </div>
      <Field label="Interne notitie" htmlFor="adminNotes" error={errors.adminNotes} hint="Bijvoorbeeld voorkeuren. Alleen zichtbaar in het beheer.">
        <Textarea id="adminNotes" name="adminNotes" maxLength={500} defaultValue={customer.adminNotes ?? ""} />
      </Field>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <DeleteButton
          action={() => deleteCustomerAction(customer.id)}
          label="Klant verwijderen"
          title="Klant en alle gegevens verwijderen?"
          description="De klant en alle bijbehorende afspraken worden definitief verwijderd (recht op vergetelheid, AVG). Dit kan niet ongedaan worden gemaakt."
        />
        <SubmitButton pendingText="Opslaan…">Opslaan</SubmitButton>
      </div>
    </form>
  );
}
