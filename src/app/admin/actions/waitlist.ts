"use server";

import { uuidSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/auth/session";
import { deleteAvailabilityAlert } from "@/server/services/waitlist";
import { refreshAll, toResult, type SimpleResult } from "./helpers";

export async function deleteAlertAction(id: string): Promise<SimpleResult> {
  await requireAdmin();
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Ongeldige aanmelding." };
  try {
    await deleteAvailabilityAlert(id);
  } catch (error) {
    return toResult(error);
  }
  refreshAll();
  return { ok: true, message: "Aanmelding verwijderd." };
}
