"use server";

import { z } from "zod";
import { MAX_EXPERIENCE_YEARS, currentYear, experienceSince } from "@/lib/barber-profile";
import { cleanText, timeSchema, uuidSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/auth/session";
import { deleteBarber, deleteService, saveBarber, saveService } from "@/server/services/admin-config";
import { formObject, invalid, refreshAll, toFormState, toResult, type SimpleResult } from "./helpers";
import type { FormState } from "./types";

const optionalId = z.union([uuidSchema, z.literal("")]).transform((v) => v || null);
const text = (max: number, message = "Vul dit veld in.") =>
  z.string().transform(cleanText).pipe(z.string().min(1, message).max(max, `Maximaal ${max} tekens.`));
const optionalText = (max: number) =>
  z
    .string()
    .transform(cleanText)
    .pipe(z.string().max(max, `Maximaal ${max} tekens.`))
    .transform((v) => v || null);

const serviceSchema = z.object({
  id: optionalId,
  name: text(60),
  description: optionalText(300),
  nameEn: optionalText(60),
  nameDe: optionalText(60),
  descriptionEn: optionalText(300),
  descriptionDe: optionalText(300),
  price: z
    .string()
    .trim()
    .transform((v) => Number(v.replace(",", ".")))
    .pipe(z.number("Vul een geldige prijs in.").min(0, "Vul een geldige prijs in.").max(10_000)),
  durationMinutes: z.coerce
    .number("Vul de duur in minuten in.")
    .int("Gebruik hele minuten.")
    .min(5, "Minimaal 5 minuten.")
    .max(480, "Maximaal 8 uur."),
  vatRate: z.coerce.number().pipe(z.union([z.literal(0), z.literal(9), z.literal(21)], "Kies een btw-tarief.")),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export async function saveServiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const data = formObject(formData);
  const parsed = serviceSchema.safeParse(data);
  if (!parsed.success) return invalid(parsed.error);
  const { id, price, ...rest } = parsed.data;
  try {
    await saveService(id, { ...rest, priceCents: Math.round(price * 100), isActive: data.isActive === "on" });
  } catch (error) {
    return toFormState(error);
  }
  refreshAll();
  return { ok: true, message: id ? "Dienst opgeslagen." : "Dienst toegevoegd." };
}

export async function deleteServiceAction(id: string): Promise<SimpleResult> {
  await requireAdmin();
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Ongeldige dienst." };
  try {
    await deleteService(id);
  } catch (error) {
    return toResult(error);
  }
  refreshAll();
  return { ok: true, message: "Dienst verwijderd." };
}

const barberSchema = z.object({
  id: optionalId,
  name: text(40),
  role: optionalText(40),
  roleEn: optionalText(40),
  roleDe: optionalText(40),
  bio: optionalText(160),
  bioEn: optionalText(160),
  bioDe: optionalText(160),
  intro: optionalText(800),
  introEn: optionalText(800),
  introDe: optionalText(800),
  /** Empty: not shown on the website. */
  experienceYears: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? Number(v.trim()) : null))
    .pipe(
      z
        .number("Vul een aantal jaren in.")
        .int("Gebruik hele jaren.")
        .min(1, "Minimaal 1 jaar (of laat het leeg).")
        .max(MAX_EXPERIENCE_YEARS, `Maximaal ${MAX_EXPERIENCE_YEARS} jaar.`)
        .nullable(),
    ),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export async function saveBarberAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const data = formObject(formData);
  const parsed = barberSchema.safeParse(data);
  if (!parsed.success) return invalid(parsed.error);

  const hours = [];
  const errors: Record<string, string> = {};
  for (let weekday = 1; weekday <= 7; weekday++) {
    const isWorking = data[`work_${weekday}`] === "on";
    const start = timeSchema.safeParse(data[`start_${weekday}`] ?? "");
    const end = timeSchema.safeParse(data[`end_${weekday}`] ?? "");
    if (!start.success || !end.success || end.data <= start.data) {
      if (isWorking) errors[`hours_${weekday}`] = "Ongeldige werktijden.";
      hours.push({ weekday, isWorking: false, startTime: "09:00", endTime: "18:00" });
      continue;
    }
    hours.push({ weekday, isWorking, startTime: start.data, endTime: end.data });
  }
  if (Object.keys(errors).length) return { error: "Controleer de werktijden.", fieldErrors: errors };

  try {
    const { id, experienceYears, ...fields } = parsed.data;
    await saveBarber(id, {
      ...fields,
      experienceSince: experienceSince(experienceYears, currentYear()),
      isCertified: data.isCertified === "on",
      isOwner: data.isOwner === "on",
      isActive: data.isActive === "on",
      hours,
    });
  } catch (error) {
    return toFormState(error);
  }
  refreshAll();
  return { ok: true, message: parsed.data.id ? "Barber opgeslagen." : "Barber toegevoegd." };
}

export async function deleteBarberAction(id: string): Promise<SimpleResult> {
  await requireAdmin();
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Ongeldige barber." };
  try {
    await deleteBarber(id);
  } catch (error) {
    return toResult(error);
  }
  refreshAll();
  return { ok: true, message: "Barber verwijderd." };
}
