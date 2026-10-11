/**
 * Till ("kassa") calculations — pure functions, no I/O.
 *
 * All amounts are in cents and include VAT, as on every consumer price list. A
 * receipt discount is spread over the lines in proportion to their amount, so the
 * VAT per rate stays correct when a receipt mixes services (9%) and products (21%).
 */

import { formatAmount } from "./format";

export const VAT_RATES = [9, 21, 0] as const;
export type VatRate = (typeof VAT_RATES)[number];

export const PAYMENT_METHODS = {
  CASH: "Contant",
  CARD: "Pin",
  OTHER: "Anders",
} as const;
export type PaymentMethodKey = keyof typeof PAYMENT_METHODS;

export interface PricedInput {
  quantity: number;
  unitPriceCents: number;
  vatRate: number;
}

export interface PricedLine {
  totalCents: number;
  discountCents: number;
  vatCents: number;
}

export type Discount = { type: "amount"; cents: number } | { type: "percent"; percent: number };

/** VAT contained in an amount that includes VAT: €10,90 at 9% contains €0,90. */
export function vatIncluded(grossCents: number, rate: number): number {
  return Math.round((grossCents * rate) / (100 + rate));
}

/** The discount in cents, never more than the subtotal and never negative. */
export function discountAmount(subtotalCents: number, discount: Discount | null): number {
  if (!discount || subtotalCents <= 0) return 0;
  const cents = discount.type === "amount" ? discount.cents : Math.round((subtotalCents * discount.percent) / 100);
  return Math.min(Math.max(0, Math.round(cents)), subtotalCents);
}

/**
 * Spreads `discountCents` over amounts in proportion to their size. Uses the
 * largest-remainder method, so the shares always add up to exactly the discount.
 */
export function allocateDiscount(amounts: number[], discountCents: number): number[] {
  const total = amounts.reduce((sum, a) => sum + a, 0);
  if (total <= 0 || discountCents <= 0) return amounts.map(() => 0);
  const exact = amounts.map((a) => (a * discountCents) / total);
  const shares = exact.map(Math.floor);
  let rest = discountCents - shares.reduce((sum, s) => sum + s, 0);
  const byRemainder = exact.map((value, i) => ({ i, remainder: value - shares[i] })).sort((a, b) => b.remainder - a.remainder);
  for (const { i } of byRemainder) {
    if (rest <= 0) break;
    shares[i]++;
    rest--;
  }
  return shares;
}

export interface PricedSale<T extends PricedInput> {
  lines: Array<T & PricedLine>;
  subtotalCents: number;
  discountCents: number;
  tipCents: number;
  /** What the customer pays: subtotal − discount + tip. */
  totalCents: number;
}

export function priceSale<T extends PricedInput>(
  lines: T[],
  opts: { discount?: Discount | null; tipCents?: number } = {},
): PricedSale<T> {
  const totals = lines.map((l) => l.quantity * l.unitPriceCents);
  const subtotalCents = totals.reduce((sum, t) => sum + t, 0);
  const discountCents = discountAmount(subtotalCents, opts.discount ?? null);
  const shares = allocateDiscount(totals, discountCents);
  const tipCents = Math.max(0, Math.round(opts.tipCents ?? 0));
  return {
    lines: lines.map((line, i) => ({
      ...line,
      totalCents: totals[i],
      discountCents: shares[i],
      vatCents: vatIncluded(totals[i] - shares[i], line.vatRate),
    })),
    subtotalCents,
    discountCents,
    tipCents,
    totalCents: subtotalCents - discountCents + tipCents,
  };
}

export interface VatSummary {
  rate: number;
  /** Amount including VAT, after discount. */
  grossCents: number;
  vatCents: number;
  netCents: number;
}

/** VAT per rate for a receipt or a period, highest rate first. */
export function summarizeVat(lines: Array<{ vatRate: number; totalCents: number; discountCents: number; vatCents: number }>): VatSummary[] {
  const byRate = new Map<number, VatSummary>();
  for (const line of lines) {
    const row = byRate.get(line.vatRate) ?? { rate: line.vatRate, grossCents: 0, vatCents: 0, netCents: 0 };
    row.grossCents += line.totalCents - line.discountCents;
    row.vatCents += line.vatCents;
    row.netCents = row.grossCents - row.vatCents;
    byRate.set(line.vatRate, row);
  }
  return [...byRate.values()].sort((a, b) => b.rate - a.rate);
}

/** Stock that needs attention: sold out, or at/below the product's warning level. */
export function stockStatus(product: { stock: number | null; lowStockAt: number | null }): "out" | "low" | null {
  if (product.stock === null) return null;
  if (product.stock <= 0) return "out";
  if (product.lowStockAt !== null && product.stock <= product.lowStockAt) return "low";
  return null;
}

/** "12,50" / "12.5" / "€ 12" → 1250. null when it isn't a valid amount. */
export function parseEuroCents(input: string): number | null {
  const cleaned = input.replace(/[€\s]/g, "").replace(",", ".");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

/** Cents → "12,50" for an input field. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export interface ReceiptInput {
  lines: Array<{ name: string; quantity: number; vatRate: number; totalCents: number; discountCents: number; vatCents: number }>;
  subtotalCents: number;
  discountCents: number;
  tipCents: number;
  totalCents: number;
}

export interface ReceiptRow {
  label: string;
  cents: number;
  kind: "line" | "subtotal" | "discount" | "tip" | "total" | "vat";
}

/** The rows of a printed or e-mailed receipt, in order. */
export function receiptRows(receipt: ReceiptInput): ReceiptRow[] {
  const rows: ReceiptRow[] = receipt.lines.map((line) => ({
    label: `${line.quantity}× ${line.name}`,
    cents: line.totalCents,
    kind: "line",
  }));
  if (receipt.discountCents !== 0) {
    rows.push({ label: "Subtotaal", cents: receipt.subtotalCents, kind: "subtotal" });
    rows.push({ label: "Korting", cents: -receipt.discountCents, kind: "discount" });
  }
  if (receipt.tipCents !== 0) rows.push({ label: "Fooi", cents: receipt.tipCents, kind: "tip" });
  rows.push({ label: "Totaal", cents: receipt.totalCents, kind: "total" });
  for (const vat of summarizeVat(receipt.lines)) {
    rows.push({ label: `Btw ${vat.rate}% over ${formatAmount(vat.grossCents)}`, cents: vat.vatCents, kind: "vat" });
  }
  return rows;
}
