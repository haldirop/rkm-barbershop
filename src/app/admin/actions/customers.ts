"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { nameSchema, notesSchema, optionalEmailSchema, phoneSchema, uuidSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/auth/session";
import { deleteCustomer, updateCustomer } from "@/server/services/customers";
import { formObject, invalid, refreshAll, toFormState, toResult, type SimpleResult } from "./helpers";
import type { FormState } from "./types";

const customerSchema = z.object({
  id: uuidSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  email: optionalEmailSchema,
  adminNotes: notesSchema,
});

export async function saveCustomerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = customerSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...input } = parsed.data;
  try {
    await updateCustomer(id, input);
  } catch (error) {
    return toFormState(error);
  }
  refreshAll();
  return { ok: true, message: "Klantgegevens opgeslagen." };
}

export async function deleteCustomerAction(id: string): Promise<SimpleResult> {
  await requireAdmin();
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Ongeldige klant." };
  try {
    await deleteCustomer(id);
  } catch (error) {
    return toResult(error);
  }
  refreshAll();
  redirect("/admin/klanten");
}
