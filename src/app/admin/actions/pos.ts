"use server";

import { z } from "zod";
import { parseEuroCents } from "@/lib/pos";
import { cleanText, isoDateSchema, uuidSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/auth/session";
import { sendReceipt } from "@/server/notifications/notify";
import { deleteProduct, saveProduct } from "@/server/services/admin-config";
import { checkout, refundSale, saveCashCount } from "@/server/services/pos";
import { formObject, invalid, refreshAll, toFormState, toResult, type SimpleResult } from "./helpers";
import type { FormState } from "./types";

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
