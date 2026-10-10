import "server-only";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { z } from "zod";
import { fieldErrors } from "@/lib/validation";
import { DomainError } from "@/server/services/shared";
import { checkAvailabilityAlerts } from "@/server/services/waitlist";
import type { FormState } from "./types";

export function formObject(formData: FormData): Record<string, string> {
  const data: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (typeof value === "string") data[key] = value;
  return data;
}

/**
 * Refreshes every admin page and the public pages that show prices, hours or availability.
 * Any change in the admin may free up room (a cancellation, a removed block, longer hours),
 * so the waiting list for fully booked days is checked too — after the response.
 */
export function refreshAll() {
  revalidatePath("/", "layout");
  after(checkAvailabilityAlerts);
}

export function invalid(error: z.ZodError): FormState {
  return { error: "Controleer de gemarkeerde velden.", fieldErrors: fieldErrors(error) };
}

export function toFormState(error: unknown): FormState {
  if (error instanceof DomainError) return { error: error.message };
  console.error("[beheer] Onverwachte fout:", error);
  return { error: "Er ging iets mis. Probeer het opnieuw." };
}

export type SimpleResult = { ok: true; message: string } | { ok: false; error: string };

export function toResult(error: unknown): SimpleResult {
  const state = toFormState(error);
  return { ok: false, error: state?.error ?? "Er ging iets mis." };
}
