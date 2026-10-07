"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AppointmentStatus } from "@/lib/status";
import {
  cleanText,
  fieldErrors,
  isoDateSchema,
  nameSchema,
  notesSchema,
  optionalEmailSchema,
  phoneSchema,
  timeSchema,
  uuidSchema,
} from "@/lib/validation";
import { requireAdmin } from "@/server/auth/session";
import { notifyMovedByShop, notifyStatusChanged } from "@/server/notifications/notify";
import {
  changeStatus,
  createAppointmentByAdmin,
  deleteAppointment,
  updateAppointment,
} from "@/server/services/appointments";
import { DomainError } from "@/server/services/shared";
import { formObject, refreshAll as refresh } from "./helpers";
import type { FormState } from "./types";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

function failure(error: unknown): ActionResult {
  if (error instanceof DomainError) return { ok: false, error: error.message };
  console.error("[beheer] Onverwachte fout:", error);
  return { ok: false, error: "Er ging iets mis. Probeer het opnieuw." };
}

const reasonSchema = z
  .string()
  .max(300)
  .transform(cleanText)
  .transform((v) => v || null)
  .optional();

const STATUS_MESSAGES: Partial<Record<AppointmentStatus, string>> = {
  APPROVED: "Afspraak bevestigd.",
  REJECTED: "Aanvraag geweigerd.",
  CANCELLED: "Afspraak geannuleerd.",
  COMPLETED: "Afspraak afgerond.",
};

export async function setAppointmentStatus(
  id: string,
  status: "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED",
  options: { reason?: string; notify?: boolean } = {},
): Promise<ActionResult> {
  const user = await requireAdmin();
  const parsedId = uuidSchema.safeParse(id);
  const reason = reasonSchema.safeParse(options.reason);
  if (!parsedId.success || !reason.success) return { ok: false, error: "Ongeldige invoer." };
  try {
    const { appointment } = await changeStatus(parsedId.data, status, {
      userId: user.id,
      reason: reason.data ?? null,
    });
    const notify = status === "APPROVED" || (options.notify ?? true);
    if (notify && status !== "COMPLETED") {
      after(() => notifyStatusChanged(appointment.id, status, reason.data));
    }
    refresh();
    return { ok: true, message: STATUS_MESSAGES[status] ?? "Opgeslagen." };
  } catch (error) {
    return failure(error);
  }
}

export async function removeAppointment(id: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer." };
  try {
    await deleteAppointment(parsed.data);
  } catch (error) {
    return failure(error);
  }
  refresh();
  redirect("/admin/afspraken");
}

// ---------------------------------------------------------------------------
// Formulier: aanmaken en bewerken
// ---------------------------------------------------------------------------

const appointmentFields = z.object({
  serviceId: uuidSchema,
  barberId: uuidSchema,
  date: isoDateSchema,
  startTime: timeSchema,
  durationMinutes: z.coerce.number().int("Hele minuten.").min(5, "Minimaal 5 minuten.").max(480, "Maximaal 8 uur."),
  price: z
    .string()
    .trim()
    .transform((v) => Number(v.replace(",", ".")))
    .pipe(z.number("Ongeldige prijs.").min(0, "Ongeldige prijs.").max(10_000, "Ongeldige prijs.")),
  notes: notesSchema,
  adminNotes: notesSchema,
});

export async function saveAppointment(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const data = formObject(formData);
  const id = uuidSchema.safeParse(data.id);
  const parsed = appointmentFields.safeParse(data);
  if (!id.success) return { error: "Ongeldige afspraak." };
  if (!parsed.success) return { error: "Controleer de gemarkeerde velden.", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  try {
    const { appointment, moved } = await updateAppointment(
      id.data,
      {
        serviceId: v.serviceId,
        barberId: v.barberId,
        date: v.date,
        startTime: v.startTime,
        durationMinutes: v.durationMinutes,
        priceCents: Math.round(v.price * 100),
        notes: v.notes,
        adminNotes: v.adminNotes,
      },
      user.id,
    );
    if (moved && appointment.status === "APPROVED" && data.notify === "on") {
      after(() => notifyMovedByShop(appointment.id));
    }
  } catch (error) {
    const result = failure(error);
    return { error: result.ok ? undefined : result.error };
  }
  refresh();
  redirect(`/admin/afspraken/${id.data}`);
}

const newCustomerFields = z.object({
  customerId: z.union([uuidSchema, z.literal("")]).transform((v) => v || null),
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  email: optionalEmailSchema,
  status: z.enum(["APPROVED", "PENDING"]),
});

export async function createAppointment(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const data = formObject(formData);
  const appointment = appointmentFields.safeParse(data);
  const customer = newCustomerFields.safeParse(data);
  if (!appointment.success || !customer.success) {
    return {
      error: "Controleer de gemarkeerde velden.",
      fieldErrors: {
        ...(appointment.success ? {} : fieldErrors(appointment.error)),
        ...(customer.success ? {} : fieldErrors(customer.error)),
      },
    };
  }
  const v = appointment.data;
  const c = customer.data;
  let createdId: string;
  try {
    const created = await createAppointmentByAdmin(
      {
        serviceId: v.serviceId,
        barberId: v.barberId,
        date: v.date,
        startTime: v.startTime,
        durationMinutes: v.durationMinutes,
        priceCents: Math.round(v.price * 100),
        notes: v.notes,
        adminNotes: v.adminNotes,
        status: c.status,
        customer: {
          customerId: c.customerId,
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone,
          email: c.email,
        },
      },
      user.id,
    );
    createdId = created.id;
    if (c.status === "APPROVED" && c.email && data.notify === "on") {
      after(() => notifyStatusChanged(created.id, "APPROVED"));
    }
  } catch (error) {
    const result = failure(error);
    return { error: result.ok ? undefined : result.error };
  }
  refresh();
  redirect(`/admin/afspraken/${createdId}`);
}
