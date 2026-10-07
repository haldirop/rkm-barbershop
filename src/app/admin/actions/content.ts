"use server";

import { z } from "zod";
import { cleanText, emailSchema, nameSchema, timeSchema, uuidSchema } from "@/lib/validation";
import { passwordProblem } from "@/server/auth/password";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { removeDemoData } from "@/server/db/seed";
import { renderEmail } from "@/emails/layout";
import { sendMail } from "@/server/notifications/mailer";
import {
  createUser,
  deleteReview,
  deleteUser,
  saveReview,
  saveSettings,
} from "@/server/services/admin-config";
import { loadSettings } from "@/server/services/settings";
import { formObject, invalid, refreshAll, toFormState, toResult, type SimpleResult } from "./helpers";
import type { FormState } from "./types";

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

const reviewSchema = z.object({
  id: z.union([uuidSchema, z.literal("")]).transform((v) => v || null),
  authorName: z.string().transform(cleanText).pipe(z.string().min(1, "Vul een naam in.").max(60)),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().transform(cleanText).pipe(z.string().min(5, "Vul de review in.").max(600)),
  source: z
    .string()
    .max(40)
    .transform(cleanText)
    .transform((v) => v || null),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export async function saveReviewAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const data = formObject(formData);
  const parsed = reviewSchema.safeParse(data);
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...input } = parsed.data;
  try {
    await saveReview(id, { ...input, isPublished: data.isPublished === "on" });
  } catch (error) {
    return toFormState(error);
  }
  refreshAll();
  return { ok: true, message: id ? "Review opgeslagen." : "Review toegevoegd." };
}

export async function deleteReviewAction(id: string): Promise<SimpleResult> {
  await requireAdmin();
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Ongeldige review." };
  try {
    await deleteReview(id);
  } catch (error) {
    return toResult(error);
  }
  refreshAll();
  return { ok: true, message: "Review verwijderd." };
}

// ---------------------------------------------------------------------------
// Instellingen
// ---------------------------------------------------------------------------

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Gebruik een volledige link die begint met https://")
  .transform((v) => v || null);

const businessSchema = z.object({
  businessName: z.string().transform(cleanText).pipe(z.string().min(2, "Vul de bedrijfsnaam in.").max(80)),
  tagline: z.string().transform(cleanText).pipe(z.string().max(120)),
  phone: z.string().transform(cleanText).pipe(z.string().min(6, "Vul een telefoonnummer in.").max(30)),
  email: emailSchema,
  street: z.string().transform(cleanText).pipe(z.string().min(2, "Vul straat en huisnummer in.").max(120)),
  postalCode: z
    .string()
    .transform((v) => cleanText(v).toUpperCase())
    .pipe(z.string().regex(/^\d{4}\s?[A-Z]{2}$/, "Gebruik een postcode zoals 1234 AB.")),
  city: z.string().transform(cleanText).pipe(z.string().min(2, "Vul de plaats in.").max(60)),
  kvkNumber: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{8}$/.test(v), "Een KvK-nummer heeft 8 cijfers.")
    .transform((v) => v || null),
  notificationEmail: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === "" || z.email().safeParse(v).success, "Vul een geldig e-mailadres in.")
    .transform((v) => v || null),
  instagramUrl: optionalUrl,
  facebookUrl: optionalUrl,
  googleReviewsUrl: optionalUrl,
});

export async function saveBusinessAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = businessSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  try {
    await saveSettings(parsed.data, true);
  } catch (error) {
    return toFormState(error);
  }
  refreshAll();
  return { ok: true, message: "Bedrijfsgegevens opgeslagen." };
}

const int = (min: number, max: number, label: string) =>
  z.coerce.number(`Vul ${label} in.`).int().min(min, `Minimaal ${min}.`).max(max, `Maximaal ${max}.`);

const rulesSchema = z.object({
  slotIntervalMinutes: z.coerce.number().pipe(z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20), z.literal(30), z.literal(60)])),
  bufferMinutes: int(0, 60, "de buffertijd"),
  minLeadMinutes: int(0, 2880, "de minimale voorbereidingstijd"),
  bookingHorizonDays: int(1, 365, "hoe ver vooruit"),
  cancellationCutoffHours: int(0, 168, "de annuleringstermijn"),
  reminderSendTime: timeSchema,
  maxOpenAppointmentsPerCustomer: int(1, 20, "het maximum"),
});

export async function saveRulesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const data = formObject(formData);
  const parsed = rulesSchema.safeParse(data);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await saveSettings({ ...parsed.data, remindersEnabled: data.remindersEnabled === "on" }, false);
  } catch (error) {
    return toFormState(error);
  }
  refreshAll();
  return { ok: true, message: "Boekingsregels opgeslagen." };
}

export async function removeDemoDataAction(): Promise<SimpleResult> {
  await requireAdmin();
  try {
    await removeDemoData(getDb());
  } catch (error) {
    return toResult(error);
  }
  refreshAll();
  return { ok: true, message: "Alle demodata is verwijderd." };
}

export async function sendTestEmailAction(): Promise<SimpleResult> {
  const user = await requireAdmin();
  const settings = await loadSettings();
  const result = await sendMail({
    to: user.email,
    ...renderEmail(`Testbericht van ${settings.businessName}`, {
      preheader: "Als je dit leest, werkt het versturen van e-mail.",
      heading: "Het werkt!",
      paragraphs: [
        "Dit is een testbericht vanuit het beheer van je website. Als je dit leest, worden e-mails correct verstuurd via Resend.",
      ],
      footer: [settings.businessName],
    }),
    template: "test",
  });
  if (!result.ok) return { ok: false, error: result.error ?? "Versturen mislukt." };
  return result.status === "SENT"
    ? { ok: true, message: `Testbericht verstuurd naar ${user.email}. Kijk ook even in je spammap.` }
    : {
        ok: false,
        error: "E-mail is nog niet gekoppeld: het bericht is alleen gelogd. Stel RESEND_API_KEY en EMAIL_FROM in.",
      };
}

// ---------------------------------------------------------------------------
// Beheerders
// ---------------------------------------------------------------------------

export async function addUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const data = formObject(formData);
  const parsed = z.object({ name: nameSchema, email: emailSchema }).safeParse(data);
  if (!parsed.success) return invalid(parsed.error);
  const problem = passwordProblem(data.password ?? "");
  if (problem) return { error: "Controleer het wachtwoord.", fieldErrors: { password: problem } };
  try {
    await createUser({ ...parsed.data, password: data.password });
  } catch (error) {
    return toFormState(error);
  }
  refreshAll();
  return { ok: true, message: `Beheerder ${parsed.data.email} toegevoegd.` };
}

export async function deleteUserAction(id: string): Promise<SimpleResult> {
  const user = await requireAdmin();
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Ongeldige gebruiker." };
  try {
    await deleteUser(id, user.id);
  } catch (error) {
    return toResult(error);
  }
  refreshAll();
  return { ok: true, message: "Beheerder verwijderd." };
}
