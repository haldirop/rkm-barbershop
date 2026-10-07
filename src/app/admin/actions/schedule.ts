"use server";

import { z } from "zod";
import { cleanText, parseBlockForm, timeSchema, uuidSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/auth/session";
import { addBlock, addBreaks, deleteBlock, deleteBreak, saveBusinessHours } from "@/server/services/admin-config";
import { formObject, invalid, refreshAll, toFormState, toResult, type SimpleResult } from "./helpers";
import type { FormState } from "./types";

export async function saveHoursAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const data = formObject(formData);
  const days = [];
  const errors: Record<string, string> = {};
  for (let weekday = 1; weekday <= 7; weekday++) {
    const isOpen = data[`open_${weekday}`] === "on";
    const from = timeSchema.safeParse(data[`from_${weekday}`] ?? "");
    const to = timeSchema.safeParse(data[`to_${weekday}`] ?? "");
    const valid = from.success && to.success && to.data > from.data;
    if (isOpen && !valid) errors[`day_${weekday}`] = "Sluitingstijd moet na openingstijd liggen.";
    days.push({
      weekday,
      isOpen,
      openTime: valid ? from.data : "09:00",
      closeTime: valid ? to.data : "18:00",
    });
  }
  if (Object.keys(errors).length) return { error: "Controleer de tijden.", fieldErrors: errors };
  try {
    await saveBusinessHours(days);
  } catch (error) {
    return toFormState(error);
  }
  refreshAll();
  return { ok: true, message: "Openingstijden opgeslagen." };
}

const optionalBarber = z.union([uuidSchema, z.literal("")]).transform((v) => v || null);
const optionalLabel = z
  .string()
  .max(80)
  .transform(cleanText)
  .transform((v) => v || null);

export async function addBreakAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const data = formObject(formData);
  const weekdays = formData.getAll("weekday").map(Number).filter((d) => d >= 1 && d <= 7);
  const parsed = z
    .object({ startTime: timeSchema, endTime: timeSchema, label: optionalLabel, barberId: optionalBarber })
    .refine((v) => v.endTime > v.startTime, { path: ["endTime"], message: "Eindtijd moet na begintijd liggen." })
    .safeParse(data);
  if (!weekdays.length) return { error: "Kies minimaal één dag.", fieldErrors: { weekday: "Kies minimaal één dag." } };
  if (!parsed.success) return invalid(parsed.error);
  try {
    await addBreaks({ weekdays, ...parsed.data });
  } catch (error) {
    return toFormState(error);
  }
  refreshAll();
  return { ok: true, message: "Pauze toegevoegd." };
}

export async function deleteBreakAction(id: string): Promise<SimpleResult> {
  await requireAdmin();
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Ongeldige pauze." };
  try {
    await deleteBreak(id);
  } catch (error) {
    return toResult(error);
  }
  refreshAll();
  return { ok: true, message: "Pauze verwijderd." };
}

export async function addBlockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const data = formObject(formData);
  const parsed = parseBlockForm(data);
  if (!parsed.success) return invalid(parsed.error);
  let affected = 0;
  try {
    ({ affected } = await addBlock(parsed.data));
  } catch (error) {
    return toFormState(error);
  }
  refreshAll();
  return {
    ok: true,
    message: affected
      ? `Blokkade toegevoegd. Let op: ${affected} bestaande ${affected === 1 ? "afspraak valt" : "afspraken vallen"} in deze periode — neem contact op met die klanten.`
      : "Blokkade toegevoegd.",
  };
}

export async function deleteBlockAction(id: string): Promise<SimpleResult> {
  await requireAdmin();
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Ongeldige blokkade." };
  try {
    await deleteBlock(id);
  } catch (error) {
    return toResult(error);
  }
  refreshAll();
  return { ok: true, message: "Blokkade verwijderd." };
}
