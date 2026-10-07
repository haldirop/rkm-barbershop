import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { appointments, customers } from "@/server/db/schema";
import { createManageToken } from "@/server/security";
import { loadSettings, siteUrl } from "@/server/services/settings";
import { sendMail } from "./mailer";
import { EMAIL_LOGO_PATH } from "@/emails/layout";
import { templates, type TemplateContext, type TemplateName } from "@/emails/templates";
import { ownerEmail } from "@/server/config";

/**
 * High-level notifications. Called from server actions via `after()`, so they
 * run once the response has been sent and never slow down or break a request.
 */

async function context(appointmentId: string, reason?: string | null): Promise<TemplateContext | null> {
  const db = getDb();
  const [row] = await db
    .select({ appointment: appointments, customer: customers })
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .where(eq(appointments.id, appointmentId));
  if (!row) return null;
  const base = siteUrl();
  const token = createManageToken(appointmentId);
  const book = new URL("/afspraak-maken", base);
  if (row.appointment.serviceId) book.searchParams.set("behandeling", row.appointment.serviceId);
  return {
    settings: await loadSettings(db),
    ...row,
    reason,
    links: {
      manage: `${base}/afspraak/${token}`,
      ics: `${base}/api/afspraak/${token}/agenda.ics`,
      book: book.toString(),
      admin: `${base}/admin/afspraken/${appointmentId}`,
      logo: `${base}${EMAIL_LOGO_PATH}`,
    },
  };
}

async function toCustomer(template: TemplateName, ctx: TemplateContext): Promise<boolean> {
  if (!ctx.customer.email) return false;
  const mail = templates[template](ctx);
  const result = await sendMail({
    ...mail,
    to: ctx.customer.email,
    replyTo: ctx.settings.email || undefined,
    template,
    appointmentId: ctx.appointment.id,
  });
  return result.ok;
}

async function toShop(template: TemplateName, ctx: TemplateContext) {
  const to = ctx.settings.notificationEmail || ownerEmail() || ctx.settings.email;
  if (!to) return;
  const mail = templates[template](ctx);
  await sendMail({
    ...mail,
    to,
    replyTo: ctx.customer.email ?? undefined,
    template,
    appointmentId: ctx.appointment.id,
  });
}

async function safely(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    console.error(`[notificaties] ${label} mislukt:`, error);
  }
}

export function notifyRequested(appointmentId: string) {
  return safely("nieuwe aanvraag", async () => {
    const ctx = await context(appointmentId);
    if (!ctx) return;
    await toCustomer("requestReceived", ctx);
    await toShop("newRequestAdmin", ctx);
  });
}

export function notifyStatusChanged(
  appointmentId: string,
  status: "APPROVED" | "REJECTED" | "CANCELLED",
  reason?: string | null,
) {
  return safely(`status ${status}`, async () => {
    const ctx = await context(appointmentId, reason);
    if (!ctx) return;
    const template: TemplateName =
      status === "APPROVED" ? "approved" : status === "REJECTED" ? "rejected" : "cancelledByShop";
    await toCustomer(template, ctx);
  });
}

export function notifyCustomerCancelled(appointmentId: string) {
  return safely("annulering door klant", async () => {
    const ctx = await context(appointmentId);
    if (!ctx) return;
    await toCustomer("cancelledByCustomer", ctx);
    await toShop("cancelledByCustomerAdmin", ctx);
  });
}

export function notifyRescheduleRequested(appointmentId: string, change: string) {
  return safely("verplaatsingsverzoek", async () => {
    const ctx = await context(appointmentId, change);
    if (!ctx) return;
    await toCustomer("rescheduleRequested", ctx);
    await toShop("rescheduleRequestedAdmin", ctx);
  });
}

export function notifyMovedByShop(appointmentId: string) {
  return safely("wijziging door zaak", async () => {
    const ctx = await context(appointmentId);
    if (ctx) await toCustomer("movedByShop", ctx);
  });
}

export async function sendReminder(appointmentId: string): Promise<boolean> {
  const ctx = await context(appointmentId);
  if (!ctx?.customer.email) return false;
  return toCustomer("reminder", ctx);
}
