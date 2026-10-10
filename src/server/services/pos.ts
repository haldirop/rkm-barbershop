import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { priceSale, summarizeVat, type Discount, type PaymentMethodKey } from "@/lib/pos";
import { timeToMinutes, zonedNow, type IsoDate, type ZonedNow } from "@/lib/time";
import { getDb, type Database, type DbOrTx } from "@/server/db/client";
import {
  adminUsers,
  appointments,
  barbers,
  cashCounts,
  customers,
  products,
  saleLines,
  sales,
  services,
  type Sale,
} from "@/server/db/schema";
import { DomainError, lockBookings, logEvent } from "./shared";

/**
 * The till ("kassa"). Every payment becomes a receipt with a consecutive number.
 * Receipts are never changed or deleted; a mistake is undone with a refund receipt
 * that mirrors the original with negative amounts.
 */

/** One till action at a time, so receipt numbers stay consecutive without gaps. */
async function lockTill(tx: DbOrTx) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(7203002)`);
}

async function nextReceiptNumber(tx: DbOrTx): Promise<number> {
  const [{ last }] = await tx
    .select({ last: sql<number>`COALESCE(MAX(${sales.number}), 0)`.mapWith(Number) })
    .from(sales);
  return last + 1;
}

export interface CheckoutItem {
  kind: "SERVICE" | "PRODUCT";
  id: string;
  quantity: number;
  unitPriceCents: number;
}

export interface CheckoutInput {
  /** Paying for an appointment: it is marked as completed. */
  appointmentId: string | null;
  customerId: string | null;
  barberId: string | null;
  items: CheckoutItem[];
  discount: Discount | null;
  tipCents: number;
  paymentMethod: PaymentMethodKey;
  note: string | null;
  userId: string | null;
}

export async function checkout(input: CheckoutInput, opts: { now?: ZonedNow } = {}, db: Database = getDb()): Promise<Sale> {
  if (!input.items.length) throw new DomainError("Voeg minimaal één behandeling of product toe.");
  const now = opts.now ?? zonedNow();

  return db.transaction(async (tx) => {
    await lockTill(tx);

    let customerId = input.customerId;
    let appointment: typeof appointments.$inferSelect | undefined;
    if (input.appointmentId) {
      await lockBookings(tx);
      [appointment] = await tx.select().from(appointments).where(eq(appointments.id, input.appointmentId)).for("update");
      if (!appointment) throw new DomainError("Deze afspraak bestaat niet meer.", "NOT_FOUND");
      if (appointment.status !== "APPROVED" && appointment.status !== "COMPLETED") {
        throw new DomainError("Alleen een bevestigde afspraak kan worden afgerekend.", "NOT_ALLOWED");
      }
      const [paid] = await tx
        .select({ number: sales.number })
        .from(sales)
        .where(and(eq(sales.appointmentId, appointment.id), eq(sales.kind, "SALE")));
      if (paid) throw new DomainError(`Deze afspraak is al afgerekend (bon ${paid.number}).`, "NOT_ALLOWED");
      customerId = appointment.customerId;
    } else if (customerId) {
      const [customer] = await tx.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId));
      if (!customer) throw new DomainError("Deze klant bestaat niet meer.", "NOT_FOUND");
    }

    const barberId = input.barberId ?? appointment?.barberId ?? null;
    let barberName = appointment?.barberName ?? null;
    if (barberId) {
      const [barber] = await tx.select({ name: barbers.name }).from(barbers).where(eq(barbers.id, barberId));
      if (!barber) throw new DomainError("Deze barber bestaat niet meer.", "NOT_FOUND");
      barberName = barber.name;
    }

    const ids = (kind: CheckoutItem["kind"]) => [...new Set(input.items.filter((i) => i.kind === kind).map((i) => i.id))];
    const serviceIds = ids("SERVICE");
    const productIds = ids("PRODUCT");
    const serviceRows = serviceIds.length ? await tx.select().from(services).where(inArray(services.id, serviceIds)) : [];
    const productRows = productIds.length
      ? await tx.select().from(products).where(inArray(products.id, productIds)).for("update")
      : [];

    const lines = input.items.map((item, i) => {
      const source =
        item.kind === "SERVICE" ? serviceRows.find((s) => s.id === item.id) : productRows.find((p) => p.id === item.id);
      if (!source) throw new DomainError("Een gekozen behandeling of product bestaat niet meer. Vernieuw de pagina.");
      if (item.kind === "PRODUCT" && !source.isActive) throw new DomainError(`${source.name} is niet meer te koop.`);
      return {
        kind: item.kind,
        serviceId: item.kind === "SERVICE" ? item.id : null,
        productId: item.kind === "PRODUCT" ? item.id : null,
        name: source.name,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        vatRate: source.vatRate,
        sortOrder: i,
      };
    });

    const soldPerProduct = new Map<string, number>();
    for (const item of input.items) {
      if (item.kind === "PRODUCT") soldPerProduct.set(item.id, (soldPerProduct.get(item.id) ?? 0) + item.quantity);
    }
    for (const product of productRows) {
      const sold = soldPerProduct.get(product.id) ?? 0;
      if (product.stock !== null && sold > product.stock) {
        throw new DomainError(`Niet genoeg voorraad van ${product.name}: er ${product.stock === 1 ? "is" : "zijn"} nog ${product.stock}.`);
      }
    }

    const priced = priceSale(lines, { discount: input.discount, tipCents: input.tipCents });
    const number = await nextReceiptNumber(tx);
    const [sale] = await tx
      .insert(sales)
      .values({
        number,
        kind: "SALE",
        date: now.date,
        appointmentId: appointment?.id ?? null,
        customerId,
        barberId,
        barberName,
        paymentMethod: input.paymentMethod,
        subtotalCents: priced.subtotalCents,
        discountCents: priced.discountCents,
        tipCents: priced.tipCents,
        totalCents: priced.totalCents,
        note: input.note,
        createdByUserId: input.userId,
      })
      .returning();
    await tx.insert(saleLines).values(priced.lines.map((line) => ({ ...line, saleId: sale.id })));

    for (const product of productRows) {
      if (product.stock === null) continue;
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${soldPerProduct.get(product.id) ?? 0}` })
        .where(eq(products.id, product.id));
    }

    if (appointment) {
      // Completing frees the time slot, so only once the appointment is over (as the
      // "Markeer als afgerond" button does); otherwise the nightly job completes it.
      const ended =
        appointment.date < now.date || (appointment.date === now.date && timeToMinutes(appointment.endTime) <= now.minutes);
      const complete = appointment.status === "APPROVED" && ended;
      if (complete) {
        await tx
          .update(appointments)
          .set({ status: "COMPLETED", statusChangedAt: new Date() })
          .where(eq(appointments.id, appointment.id));
      }
      await logEvent(tx, {
        appointmentId: appointment.id,
        type: complete ? "COMPLETED" : "UPDATED",
        actor: "ADMIN",
        actorUserId: input.userId,
        message: `Afgerekend: bon ${number}.`,
      });
    }
    return sale;
  });
}

/** Undoes a receipt with a refund receipt (negative amounts); products go back into stock. */
export async function refundSale(
  saleId: string,
  input: { reason: string; userId: string | null },
  opts: { now?: ZonedNow } = {},
  db: Database = getDb(),
): Promise<Sale> {
  const now = opts.now ?? zonedNow();
  return db.transaction(async (tx) => {
    await lockTill(tx);
    const [original] = await tx.select().from(sales).where(eq(sales.id, saleId)).for("update");
    if (!original) throw new DomainError("Deze bon bestaat niet.", "NOT_FOUND");
    if (original.kind === "REFUND") throw new DomainError("Een tegenboeking kun je niet terugdraaien.", "NOT_ALLOWED");
    const [existing] = await tx.select({ number: sales.number }).from(sales).where(eq(sales.refundOfId, original.id));
    if (existing) throw new DomainError(`Deze bon is al teruggedraaid met bon ${existing.number}.`, "NOT_ALLOWED");

    const lines = await tx.select().from(saleLines).where(eq(saleLines.saleId, original.id)).orderBy(asc(saleLines.sortOrder));
    const number = await nextReceiptNumber(tx);
    const [refund] = await tx
      .insert(sales)
      .values({
        number,
        kind: "REFUND",
        refundOfId: original.id,
        date: now.date,
        appointmentId: original.appointmentId,
        customerId: original.customerId,
        barberId: original.barberId,
        barberName: original.barberName,
        paymentMethod: original.paymentMethod,
        subtotalCents: -original.subtotalCents,
        discountCents: -original.discountCents,
        tipCents: -original.tipCents,
        totalCents: -original.totalCents,
        note: input.reason,
        createdByUserId: input.userId,
      })
      .returning();
    if (lines.length) {
      await tx.insert(saleLines).values(
        lines.map((line) => ({
          saleId: refund.id,
          kind: line.kind,
          serviceId: line.serviceId,
          productId: line.productId,
          name: line.name,
          quantity: -line.quantity,
          unitPriceCents: line.unitPriceCents,
          vatRate: line.vatRate,
          totalCents: -line.totalCents,
          discountCents: -line.discountCents,
          vatCents: -line.vatCents,
          sortOrder: line.sortOrder,
        })),
      );
    }
    for (const line of lines) {
      if (!line.productId) continue;
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} + ${line.quantity}` })
        .where(and(eq(products.id, line.productId), sql`${products.stock} IS NOT NULL`));
    }
    return refund;
  });
}

// ---------------------------------------------------------------------------
// Bonnen bekijken
// ---------------------------------------------------------------------------

export async function getSale(id: string, db: DbOrTx = getDb()) {
  const [row] = await db
    .select({
      sale: sales,
      customer: { id: customers.id, firstName: customers.firstName, lastName: customers.lastName, email: customers.email },
      cashier: adminUsers.name,
    })
    .from(sales)
    .leftJoin(customers, eq(customers.id, sales.customerId))
    .leftJoin(adminUsers, eq(adminUsers.id, sales.createdByUserId))
    .where(eq(sales.id, id));
  if (!row) return null;
  const relatedId = row.sale.kind === "SALE" ? eq(sales.refundOfId, id) : eq(sales.id, row.sale.refundOfId ?? id);
  const [lines, [related]] = await Promise.all([
    db.select().from(saleLines).where(eq(saleLines.saleId, id)).orderBy(asc(saleLines.sortOrder)),
    db.select({ id: sales.id, number: sales.number }).from(sales).where(relatedId),
  ]);
  return {
    ...row,
    lines,
    vat: summarizeVat(lines),
    /** The refund receipt that undid this sale. */
    refundedBy: row.sale.kind === "SALE" ? (related ?? null) : null,
    /** The sale this refund undoes. */
    refundOf: row.sale.kind === "REFUND" ? (related ?? null) : null,
  };
}

export type SaleDetail = NonNullable<Awaited<ReturnType<typeof getSale>>>;

export async function listSales(from: IsoDate, to: IsoDate, db: DbOrTx = getDb()) {
  return db
    .select({
      id: sales.id,
      number: sales.number,
      kind: sales.kind,
      date: sales.date,
      createdAt: sales.createdAt,
      totalCents: sales.totalCents,
      tipCents: sales.tipCents,
      paymentMethod: sales.paymentMethod,
      barberName: sales.barberName,
      firstName: customers.firstName,
      lastName: customers.lastName,
      refundedBy: sql<number | null>`(SELECT r."number" FROM "sales" r WHERE r."refund_of_id" = ${sales.id})`,
      lineNames: sql<string>`(SELECT string_agg(l."name", ', ' ORDER BY l."sort_order") FROM "sale_lines" l WHERE l."sale_id" = ${sales.id})`,
    })
    .from(sales)
    .leftJoin(customers, eq(customers.id, sales.customerId))
    .where(and(gte(sales.date, from), lte(sales.date, to)))
    .orderBy(desc(sales.number));
}

/** The receipt for an appointment, if it has been paid. */
export async function getSaleForAppointment(appointmentId: string, db: DbOrTx = getDb()) {
  const [row] = await db
    .select({ id: sales.id, number: sales.number })
    .from(sales)
    .where(and(eq(sales.appointmentId, appointmentId), eq(sales.kind, "SALE")));
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Afrekenen: afspraken die nog betaald moeten worden
// ---------------------------------------------------------------------------

const checkoutColumns = {
  id: appointments.id,
  date: appointments.date,
  startTime: appointments.startTime,
  endTime: appointments.endTime,
  status: appointments.status,
  serviceId: appointments.serviceId,
  serviceName: appointments.serviceName,
  priceCents: appointments.priceCents,
  barberId: appointments.barberId,
  barberName: appointments.barberName,
  customerId: customers.id,
  firstName: customers.firstName,
  lastName: customers.lastName,
  email: customers.email,
  paidReceipt: sales.number,
};

function checkoutQuery(db: DbOrTx) {
  return db
    .select(checkoutColumns)
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .leftJoin(sales, and(eq(sales.appointmentId, appointments.id), eq(sales.kind, "SALE")));
}

export type CheckoutAppointment = Awaited<ReturnType<typeof getCheckoutAppointment>>;

/** Confirmed appointments on a day that haven't been paid yet. */
export async function listUnpaidAppointments(date: IsoDate, db: DbOrTx = getDb()) {
  return checkoutQuery(db)
    .where(and(eq(appointments.date, date), inArray(appointments.status, ["APPROVED", "COMPLETED"]), isNull(sales.id)))
    .orderBy(asc(appointments.startTime));
}

export async function getCheckoutAppointment(id: string, db: DbOrTx = getDb()) {
  const [row] = await checkoutQuery(db).where(eq(appointments.id, id));
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Overzichten, dagafsluiting en export
// ---------------------------------------------------------------------------

const money = (expression: ReturnType<typeof sql>) => sql<number>`COALESCE(${expression}, 0)`.mapWith(Number);

export async function salesSummary(from: IsoDate, to: IsoDate, db: DbOrTx = getDb()) {
  const inPeriod = and(gte(sales.date, from), lte(sales.date, to));
  const [[totals], byMethod, vatRows, items, byBarber] = await Promise.all([
    db
      .select({
        receipts: money(sql`COUNT(*) FILTER (WHERE ${sales.kind} = 'SALE')`),
        refunds: money(sql`COUNT(*) FILTER (WHERE ${sales.kind} = 'REFUND')`),
        revenueCents: money(sql`SUM(${sales.totalCents} - ${sales.tipCents})`),
        tipsCents: money(sql`SUM(${sales.tipCents})`),
        discountsCents: money(sql`SUM(${sales.discountCents})`),
        receivedCents: money(sql`SUM(${sales.totalCents})`),
      })
      .from(sales)
      .where(inPeriod),
    db
      .select({ method: sales.paymentMethod, cents: money(sql`SUM(${sales.totalCents})`) })
      .from(sales)
      .where(inPeriod)
      .groupBy(sales.paymentMethod),
    db
      .select({
        vatRate: saleLines.vatRate,
        totalCents: money(sql`SUM(${saleLines.totalCents})`),
        discountCents: money(sql`SUM(${saleLines.discountCents})`),
        vatCents: money(sql`SUM(${saleLines.vatCents})`),
      })
      .from(saleLines)
      .innerJoin(sales, eq(sales.id, saleLines.saleId))
      .where(inPeriod)
      .groupBy(saleLines.vatRate),
    db
      .select({
        kind: saleLines.kind,
        name: saleLines.name,
        quantity: money(sql`SUM(${saleLines.quantity})`),
        revenueCents: money(sql`SUM(${saleLines.totalCents} - ${saleLines.discountCents})`),
      })
      .from(saleLines)
      .innerJoin(sales, eq(sales.id, saleLines.saleId))
      .where(inPeriod)
      .groupBy(saleLines.kind, saleLines.name)
      .orderBy(desc(sql`SUM(${saleLines.totalCents} - ${saleLines.discountCents})`)),
    db
      .select({ barberName: sales.barberName, revenueCents: money(sql`SUM(${sales.totalCents} - ${sales.tipCents})`) })
      .from(sales)
      .where(inPeriod)
      .groupBy(sales.barberName)
      .orderBy(desc(sql`SUM(${sales.totalCents} - ${sales.tipCents})`)),
  ]);
  const method = (m: PaymentMethodKey) => byMethod.find((r) => r.method === m)?.cents ?? 0;
  return {
    ...totals,
    byMethod: { CASH: method("CASH"), CARD: method("CARD"), OTHER: method("OTHER") },
    vat: summarizeVat(vatRows),
    items: items.filter((i) => i.quantity !== 0 || i.revenueCents !== 0),
    byBarber: byBarber.filter((b) => b.revenueCents !== 0),
  };
}

export type SalesSummary = Awaited<ReturnType<typeof salesSummary>>;

async function cashSalesOn(date: IsoDate, db: DbOrTx) {
  const [{ cents }] = await db
    .select({ cents: money(sql`SUM(${sales.totalCents})`) })
    .from(sales)
    .where(and(eq(sales.date, date), eq(sales.paymentMethod, "CASH")));
  return cents;
}

export async function getCashCount(date: IsoDate, db: DbOrTx = getDb()) {
  const [row] = await db
    .select({ count: cashCounts, countedBy: adminUsers.name })
    .from(cashCounts)
    .leftJoin(adminUsers, eq(adminUsers.id, cashCounts.countedByUserId))
    .where(eq(cashCounts.date, date));
  return row ? { ...row.count, countedBy: row.countedBy } : null;
}

/** Records the counted cash for a day; counting again replaces the earlier count. */
export async function saveCashCount(
  date: IsoDate,
  input: { floatCents: number; countedCents: number; note: string | null; userId: string | null },
  opts: { now?: ZonedNow } = {},
  db: DbOrTx = getDb(),
) {
  const today = (opts.now ?? zonedNow()).date;
  if (date > today) throw new DomainError("Je kunt de kas niet vooruit tellen.");
  const values = {
    floatCents: input.floatCents,
    cashSalesCents: await cashSalesOn(date, db),
    countedCents: input.countedCents,
    note: input.note,
    countedByUserId: input.userId,
  };
  const [row] = await db
    .insert(cashCounts)
    .values({ date, ...values })
    .onConflictDoUpdate({ target: cashCounts.date, set: { ...values, updatedAt: new Date() } })
    .returning();
  return row;
}

export async function listCashCounts(limit = 14, db: DbOrTx = getDb()) {
  return db.select().from(cashCounts).orderBy(desc(cashCounts.date)).limit(limit);
}

const csvMoney = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const csvCell = (value: string | number) => {
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const shopTime = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
const METHOD_LABEL: Record<PaymentMethodKey, string> = { CASH: "Contant", CARD: "Pin", OTHER: "Anders" };

/** All receipt lines in a period, for the accountant (semicolons + decimal commas, as Dutch Excel expects). */
export async function exportSalesCsv(from: IsoDate, to: IsoDate, db: DbOrTx = getDb()): Promise<string> {
  const rows = await db
    .select({ sale: sales, line: saleLines })
    .from(sales)
    .leftJoin(saleLines, eq(saleLines.saleId, sales.id))
    .where(and(gte(sales.date, from), lte(sales.date, to)))
    .orderBy(asc(sales.number), asc(saleLines.sortOrder));

  const header = [
    "Bonnummer",
    "Soort",
    "Datum",
    "Tijd",
    "Omschrijving",
    "Aantal",
    "Prijs per stuk",
    "Btw %",
    "Korting",
    "Bedrag incl. btw",
    "Btw",
    "Betaalwijze",
    "Barber",
  ];
  const out: Array<Array<string | number>> = [header];
  let lastSale: string | null = null;
  const tipRow = (sale: Sale) => [
    sale.number,
    sale.kind === "SALE" ? "Verkoop" : "Tegenboeking",
    sale.date,
    shopTime.format(sale.createdAt),
    "Fooi (geen omzet)",
    "",
    "",
    "",
    "",
    csvMoney(sale.tipCents),
    "",
    METHOD_LABEL[sale.paymentMethod],
    sale.barberName ?? "",
  ];
  for (const [i, { sale, line }] of rows.entries()) {
    if (line) {
      out.push([
        sale.number,
        sale.kind === "SALE" ? "Verkoop" : "Tegenboeking",
        sale.date,
        shopTime.format(sale.createdAt),
        line.name,
        line.quantity,
        csvMoney(line.unitPriceCents),
        line.vatRate,
        csvMoney(line.discountCents),
        csvMoney(line.totalCents - line.discountCents),
        csvMoney(line.vatCents),
        METHOD_LABEL[sale.paymentMethod],
        sale.barberName ?? "",
      ]);
    }
    lastSale = sale.id;
    const isLastLineOfSale = rows[i + 1]?.sale.id !== lastSale;
    if (isLastLineOfSale && sale.tipCents !== 0) out.push(tipRow(sale));
  }
  // The BOM makes Excel read the file as UTF-8 (é, ë, €).
  return "﻿" + out.map((row) => row.map(csvCell).join(";")).join("\r\n") + "\r\n";
}
