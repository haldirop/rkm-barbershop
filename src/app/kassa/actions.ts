"use server";

import { z } from "zod";
import { parseEuroCents } from "@/lib/pos";
import { formatDateLong } from "@/lib/format";
import { cleanText, isoDateSchema, uuidSchema } from "@/lib/validation";
import { isOwner, requireAdmin } from "@/server/auth/session";
import { sendReceipt } from "@/server/notifications/notify";
import { deleteProduct, saveProduct } from "@/server/services/admin-config";
import {
  checkout,
  deleteCashCount,
  deleteSale,
  purgeCashCount,
  purgeSale,
  refundSale,
  saveCashCount,
} from "@/server/services/pos";
import { formObject, invalid, refreshAll, toFormState, toResult, type SimpleResult } from "@/app/admin/actions/helpers";
import type { FormState } from "@/app/admin/actions/types";

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v === "" || z.email().safeParse(v).success, "Vul een geldig e-mailadres in.");

const note = z
  .string()
  .max(300, "Maximaal 300 tekens.")
  .transform(cleanText)
  .transform((v) => v || null);

const checkoutSchema = z.object({
  appointmentId: uuidSchema.nullable(),
  barberId: uuidSchema.nullable(),
  items: z
    .array(
      z.object({
        kind: z.enum(["SERVICE", "PRODUCT"]),
        id: uuidSchema,
        quantity: z.number().int().min(1).max(99),
        unitPriceCents: z.number().int().min(0).max(1_000_000),
      }),
    )
    .min(1, "Voeg minimaal één behandeling of product toe.")
    .max(30),
  discount: z
    .discriminatedUnion("type", [
      z.object({ type: z.literal("amount"), cents: z.number().int().min(0).max(1_000_000) }),
      z.object({ type: z.literal("percent"), percent: z.number().min(0).max(100) }),
    ])
    .nullable(),
  tipCents: z.number().int().min(0).max(100_000),
  paymentMethod: z.enum(["CASH", "CARD", "OTHER"]),
  note,
  receiptEmail: optionalEmail,
});

export type CheckoutResult =
  | {
      ok: true;
      saleId: string;
      number: number;
      totalCents: number;
      /** Set when a receipt e-mail was requested. */
      email?: { to: string; ok: boolean; error?: string };
    }
  | { ok: false; error: string };

export async function checkoutAction(input: unknown): Promise<CheckoutResult> {
  const user = await requireAdmin();
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Controleer de bon." };
  const { receiptEmail, ...data } = parsed.data;

  let sale;
  try {
    sale = await checkout({ ...data, customerId: null, userId: user.id });
  } catch (error) {
    return { ok: false, error: toFormState(error)?.error ?? "Er ging iets mis. Probeer het opnieuw." };
  }
  refreshAll();
  const email = receiptEmail ? { to: receiptEmail, ...(await sendReceipt(sale.id, receiptEmail)) } : undefined;
  return { ok: true, saleId: sale.id, number: sale.number, totalCents: sale.totalCents, email };
}

export async function refundAction(saleId: string, reason: string): Promise<SimpleResult & { refundId?: string }> {
  const user = await requireAdmin();
  const parsed = z
    .object({ saleId: uuidSchema, reason: z.string().transform(cleanText).pipe(z.string().min(3, "Geef een korte reden op.").max(300)) })
    .safeParse({ saleId, reason });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer." };
  try {
    const refund = await refundSale(parsed.data.saleId, { reason: parsed.data.reason, userId: user.id });
    refreshAll();
    return { ok: true, message: `Tegenboeking gemaakt: bon ${refund.number}.`, refundId: refund.id };
  } catch (error) {
    return toResult(error);
  }
}

const receiptsLabel = (numbers: number[]) => `Bon ${numbers.join(" en ")}`;

/**
 * Only the owner (ADMIN_EMAIL) may remove a receipt. By default it stays on record with
 * the reason ("Verwijderde bonnen"); with `permanent` it is wiped completely.
 */
export async function deleteSaleAction(saleId: string, reason: string, permanent = false): Promise<SimpleResult> {
  const user = await requireAdmin();
  if (!isOwner(user)) return { ok: false, error: "Alleen de eigenaar kan bonnen verwijderen." };
  const parsed = z
    .object({
      saleId: uuidSchema,
      reason: z.string().transform(cleanText).pipe(z.string().min(3, "Geef een korte reden op.").max(300)),
      permanent: z.boolean(),
    })
    .safeParse({ saleId, reason, permanent });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer." };
  try {
    const numbers = await deleteSale(parsed.data.saleId, { reason: parsed.data.reason, userId: user.id });
    if (parsed.data.permanent) await purgeSale(parsed.data.saleId);
    refreshAll();
    return { ok: true, message: `${receiptsLabel(numbers)} ${parsed.data.permanent ? "definitief " : ""}verwijderd.` };
  } catch (error) {
    return toResult(error);
  }
}

/** Owner only: wipe a receipt that was removed earlier, so it is gone everywhere. */
export async function purgeSaleAction(saleId: string): Promise<SimpleResult> {
  const user = await requireAdmin();
  if (!isOwner(user)) return { ok: false, error: "Alleen de eigenaar kan bonnen verwijderen." };
  if (!uuidSchema.safeParse(saleId).success) return { ok: false, error: "Ongeldige bon." };
  try {
    const numbers = await purgeSale(saleId);
    refreshAll();
    return { ok: true, message: `${receiptsLabel(numbers)} definitief verwijderd.` };
  } catch (error) {
    return toResult(error);
  }
}

export async function emailReceiptAction(saleId: string, to: string): Promise<SimpleResult> {
  await requireAdmin();
  const parsed = z.object({ saleId: uuidSchema, to: z.email("Vul een geldig e-mailadres in.") }).safeParse({
    saleId,
    to: to.trim().toLowerCase(),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer." };
  const result = await sendReceipt(parsed.data.saleId, parsed.data.to);
  return result.ok
    ? { ok: true, message: `Bon gemaild naar ${parsed.data.to}.` }
    : { ok: false, error: `Mailen mislukt: ${result.error ?? "onbekende fout"}` };
}

const euros = (label: string) =>
  z.string().transform((value, ctx) => {
    const cents = parseEuroCents(value.trim() || "0");
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: `Vul ${label} in als bedrag, bijv. 50,00.` });
      return z.NEVER;
    }
    return cents;
  });

const cashCountSchema = z.object({
  date: isoDateSchema,
  float: euros("het wisselgeld"),
  counted: euros("het getelde bedrag"),
  note,
});

export async function saveCashCountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const parsed = cashCountSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  try {
    await saveCashCount(parsed.data.date, {
      floatCents: parsed.data.float,
      countedCents: parsed.data.counted,
      note: parsed.data.note,
      userId: user.id,
    });
  } catch (error) {
    return toFormState(error);
  }
  refreshAll();
  return { ok: true, message: "Kastelling opgeslagen." };
}

/** Owner only: remove a cash count (kept under "Verwijderde kastellingen"), or wipe it with `permanent`. */
export async function deleteCashCountAction(id: string, reason: string, permanent = false): Promise<SimpleResult> {
  const user = await requireAdmin();
  if (!isOwner(user)) return { ok: false, error: "Alleen de eigenaar kan kastellingen verwijderen." };
  const parsed = z
    .object({
      id: uuidSchema,
      reason: z.string().transform(cleanText).pipe(z.string().min(3, "Geef een korte reden op.").max(300)),
      permanent: z.boolean(),
    })
    .safeParse({ id, reason, permanent });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer." };
  try {
    const count = await deleteCashCount(parsed.data.id, { reason: parsed.data.reason, userId: user.id });
    if (parsed.data.permanent) await purgeCashCount(count.id);
    refreshAll();
    return {
      ok: true,
      message: `Kastelling van ${formatDateLong(count.date)} ${parsed.data.permanent ? "definitief " : ""}verwijderd.`,
    };
  } catch (error) {
    return toResult(error);
  }
}

/** Owner only: wipe a removed cash count for good. */
export async function purgeCashCountAction(id: string): Promise<SimpleResult> {
  const user = await requireAdmin();
  if (!isOwner(user)) return { ok: false, error: "Alleen de eigenaar kan kastellingen verwijderen." };
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Ongeldige kastelling." };
  try {
    const count = await purgeCashCount(id);
    refreshAll();
    return { ok: true, message: `Kastelling van ${formatDateLong(count.date)} definitief verwijderd.` };
  } catch (error) {
    return toResult(error);
  }
}

// ---------------------------------------------------------------------------
// Producten
// ---------------------------------------------------------------------------

const productSchema = z.object({
  id: z.union([uuidSchema, z.literal("")]).transform((v) => v || null),
  name: z.string().transform(cleanText).pipe(z.string().min(1, "Vul een naam in.").max(60, "Maximaal 60 tekens.")),
  price: euros("de prijs"),
  vatRate: z.coerce.number().pipe(z.union([z.literal(0), z.literal(9), z.literal(21)])),
  stock: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{1,5}$/.test(v), "Vul een heel aantal in, of laat leeg.")
    .transform((v) => (v === "" ? null : Number(v))),
  lowStockAt: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{1,5}$/.test(v), "Vul een heel aantal in, of laat leeg.")
    .transform((v) => (v === "" ? null : Number(v))),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export async function saveProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const data = formObject(formData);
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) return invalid(parsed.error);
  const { id, price, ...rest } = parsed.data;
  try {
    await saveProduct(id, { ...rest, priceCents: price, isActive: data.isActive === "on" });
  } catch (error) {
    return toFormState(error);
  }
  refreshAll();
  return { ok: true, message: id ? "Product opgeslagen." : "Product toegevoegd." };
}

export async function deleteProductAction(id: string): Promise<SimpleResult> {
  await requireAdmin();
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Ongeldig product." };
  try {
    await deleteProduct(id);
  } catch (error) {
    return toResult(error);
  }
  refreshAll();
  return { ok: true, message: "Product verwijderd." };
}
