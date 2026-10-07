import { z } from "zod";
import { isIsoDate, isTimeString } from "./time";

/** Removes control characters (except newlines/tabs) and trims. */
export function cleanText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

/** "+31 (0)6-12 34 56 78" → "+31612345678", "06 12345678" → "0612345678" */
export function normalizePhone(value: string): string {
  const cleaned = value.replace(/\(0\)/g, "").replace(/[^\d+]/g, "");
  return cleaned.startsWith("00") ? `+${cleaned.slice(2)}` : cleaned;
}

const NAME_RE = /^[\p{L}][\p{L}\p{M}' .-]*$/u;

export const nameSchema = z
  .string()
  .transform(cleanText)
  .pipe(
    z
      .string()
      .min(1, "Vul dit veld in.")
      .max(60, "Maximaal 60 tekens.")
      .regex(NAME_RE, "Gebruik alleen letters, spaties of koppeltekens."),
  );

export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .pipe(
    z
      .string()
      .min(1, "Vul je telefoonnummer in.")
      .regex(/^\+?\d{9,15}$/, "Vul een geldig telefoonnummer in, bijvoorbeeld 06 12345678."),
  );

export const emailSchema = z
  .string()
  .transform((v) => cleanText(v).toLowerCase())
  .pipe(z.email("Vul een geldig e-mailadres in.").max(254));

export const optionalEmailSchema = z
  .string()
  .transform((v) => cleanText(v).toLowerCase())
  .pipe(z.union([z.literal(""), z.email("Vul een geldig e-mailadres in.").max(254)]))
  .transform((v) => v || null);

export const notesSchema = z
  .string()
  .transform(cleanText)
  .pipe(z.string().max(500, "Maximaal 500 tekens."))
  .transform((v) => v || null);

export const isoDateSchema = z.string().refine(isIsoDate, "Ongeldige datum.");
export const timeSchema = z
  .string()
  .refine(isTimeString, "Ongeldige tijd.")
  .transform((v) => v.slice(0, 5));
export const uuidSchema = z.uuid("Ongeldige keuze.");

export const customerDetailsSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
  notes: notesSchema,
});

export type CustomerDetails = z.infer<typeof customerDetailsSchema>;

export const bookingRequestSchema = customerDetailsSchema.extend({
  serviceId: uuidSchema,
  /** null = geen voorkeur */
  barberId: uuidSchema.nullable(),
  date: isoDateSchema,
  startTime: timeSchema,
  privacyAccepted: z.literal(true, "Ga akkoord met de verwerking van je gegevens."),
  /** Honeypot: must stay empty (bots fill every field). */
  website: z.string().max(0).optional(),
});

export type BookingRequest = z.input<typeof bookingRequestSchema>;

export type FieldErrors = Partial<Record<string, string>>;

/** First error message per field, for showing under form inputs. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    result[key] ??= issue.message;
  }
  return result;
}

/**
 * A block (closed period) from the admin form. With "Hele dag" ticked the time
 * fields are not shown at all, so they are treated as empty instead of required.
 */
export function parseBlockForm(data: Record<string, string>) {
  const allDay = data.allDay === "on";
  return z
    .object({
      startDate: isoDateSchema,
      endDate: z.union([isoDateSchema, z.literal("")]),
      startTime: timeSchema.nullable(),
      endTime: timeSchema.nullable(),
      barberId: z.union([uuidSchema, z.literal("")]).transform((v) => v || null),
      reason: z
        .string()
        .max(80)
        .transform(cleanText)
        .transform((v) => v || null),
    })
    .transform((v) => ({ ...v, endDate: v.endDate || v.startDate }))
    .refine((v) => v.endDate >= v.startDate, { path: ["endDate"], message: "Einddatum ligt voor de begindatum." })
    .refine((v) => !v.startTime || !v.endTime || v.endTime > v.startTime, {
      path: ["endTime"],
      message: "Eindtijd moet na begintijd liggen.",
    })
    .safeParse({
      startDate: data.startDate ?? "",
      endDate: data.endDate ?? "",
      startTime: allDay ? null : (data.startTime ?? ""),
      endTime: allDay ? null : (data.endTime ?? ""),
      barberId: data.barberId ?? "",
      reason: data.reason ?? "",
    });
}
