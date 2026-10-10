import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { allocateDiscount, discountAmount, parseEuroCents, priceSale, summarizeVat, vatIncluded } from "@/lib/pos";
import type { ZonedNow } from "@/lib/time";
import { openDatabase, setDb, type DatabaseHandle } from "@/server/db/client";
import { appointments, appointmentEvents, barbers, cashCounts, customers, emailLog, products, sales, services } from "@/server/db/schema";
import { seedBaseData } from "@/server/db/seed";
import { sendReceipt } from "@/server/notifications/notify";
import { changeStatus } from "@/server/services/appointments";
import { createBookingRequest } from "@/server/services/booking";
import {
  checkout,
  deleteCashCount,
  deleteSale,
  exportSalesCsv,
  getCashCount,
  getSale,
  listCashCounts,
  listDeletedCashCounts,
  listDeletedSales,
  listSales,
  listUnpaidAppointments,
  purgeCashCount,
  purgeSale,
  refundSale,
  salesSummary,
  saveCashCount,
  type CheckoutInput,
} from "@/server/services/pos";

describe("till calculations", () => {
  it("finds the VAT inside a price that includes VAT", () => {
    expect(vatIncluded(2500, 9)).toBe(206); // €25,00 incl. 9% → €2,06 btw
    expect(vatIncluded(1210, 21)).toBe(210);
    expect(vatIncluded(1000, 0)).toBe(0);
  });

  it("caps a discount at the subtotal", () => {
    expect(discountAmount(5000, { type: "percent", percent: 10 })).toBe(500);
    expect(discountAmount(5000, { type: "amount", cents: 9000 })).toBe(5000);
    expect(discountAmount(5000, { type: "amount", cents: -100 })).toBe(0);
    expect(discountAmount(5000, null)).toBe(0);
  });

  it("spreads a discount over the lines without losing a cent", () => {
    expect(allocateDiscount([2500, 1500], 1000)).toEqual([625, 375]);
    const shares = allocateDiscount([1000, 1000, 1000], 100);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100);
    expect(allocateDiscount([0, 0], 100)).toEqual([0, 0]);
  });

  it("prices a receipt with a service, a product, a discount and a tip", () => {
    const sale = priceSale(
      [
        { quantity: 1, unitPriceCents: 2500, vatRate: 9 },
        { quantity: 2, unitPriceCents: 1210, vatRate: 21 },
      ],
      { discount: { type: "amount", cents: 492 }, tipCents: 300 },
    );
    expect(sale.subtotalCents).toBe(4920);
    expect(sale.discountCents).toBe(492);
    expect(sale.totalCents).toBe(4920 - 492 + 300);
    expect(sale.lines.map((l) => l.discountCents)).toEqual([250, 242]);
    const vat = summarizeVat(sale.lines);
    expect(vat).toEqual([
      { rate: 21, grossCents: 2178, vatCents: 378, netCents: 1800 },
      { rate: 9, grossCents: 2250, vatCents: 186, netCents: 2064 },
    ]);
  });

  it("reads amounts the way people type them", () => {
    expect(parseEuroCents("12,50")).toBe(1250);
    expect(parseEuroCents("€ 7")).toBe(700);
    expect(parseEuroCents("3.5")).toBe(350);
    expect(parseEuroCents("abc")).toBeNull();
    expect(parseEuroCents("-5")).toBeNull();
  });
});

// Monday 5 October 2026, 10:00.
const NOW: ZonedNow = { date: "2026-10-05", minutes: 600 };

let handle: DatabaseHandle;
let knippenId: string;
let rayanId: string;
let waxId: string;

beforeAll(async () => {
  handle = openDatabase({ kind: "pglite", dataDir: undefined });
  await handle.migrate();
  await seedBaseData(handle.db);
  setDb(handle.db);
  knippenId = (await handle.db.select().from(services).where(eq(services.name, "Knippen")))[0].id;
  rayanId = (await handle.db.select().from(barbers).where(eq(barbers.name, "Rayan")))[0].id;
});

beforeEach(async () => {
  await handle.db.delete(sales).where(eq(sales.kind, "REFUND"));
  await handle.db.delete(sales);
  await handle.db.delete(cashCounts);
  await handle.db.delete(emailLog);
  await handle.db.delete(products);
  await handle.db.delete(appointments);
  await handle.db.delete(customers);
  [{ id: waxId }] = await handle.db
    .insert(products)
    .values({ name: "Wax", priceCents: 1495, vatRate: 21, stock: 3 })
    .returning({ id: products.id });
});

afterAll(async () => {
  setDb(undefined);
  await handle.close();
});

function walkIn(overrides: Partial<CheckoutInput> = {}): CheckoutInput {
  return {
    appointmentId: null,
    customerId: null,
    barberId: rayanId,
    items: [{ kind: "SERVICE", id: knippenId, quantity: 1, unitPriceCents: 2500 }],
    discount: null,
    tipCents: 0,
    paymentMethod: "CASH",
    note: null,
    userId: null,
    ...overrides,
  };
}

async function approvedAppointment() {
  const { appointment } = await createBookingRequest(
    {
      serviceId: knippenId,
      barberId: rayanId,
      date: NOW.date,
      startTime: "14:00",
      firstName: "Jan",
      lastName: "Jansen",
      phone: "0612345678",
      email: "jan@example.com",
      notes: null,
    },
    { now: NOW },
  );
  await changeStatus(appointment.id, "APPROVED", { userId: null });
  return appointment;
}

describe("till", () => {
  it("numbers receipts consecutively and stores VAT per line", async () => {
    const first = await checkout(walkIn(), { now: NOW });
    const second = await checkout(
      walkIn({ items: [{ kind: "PRODUCT", id: waxId, quantity: 2, unitPriceCents: 1495 }], paymentMethod: "CARD" }),
      { now: NOW },
    );
    expect(second.number).toBe(first.number + 1);
    const detail = await getSale(second.id);
    expect(detail?.sale).toMatchObject({ totalCents: 2990, paymentMethod: "CARD", barberName: "Rayan", date: NOW.date });
    expect(detail?.lines[0]).toMatchObject({ name: "Wax", quantity: 2, vatRate: 21, totalCents: 2990, vatCents: 519 });
  });

  it("pays an appointment once and marks it as completed", async () => {
    const appointment = await approvedAppointment();
    expect((await listUnpaidAppointments(NOW.date)).map((a) => a.id)).toEqual([appointment.id]);

    // 15:00, after the 14:00–14:30 appointment.
    const sale = await checkout(walkIn({ appointmentId: appointment.id, barberId: null }), {
      now: { date: NOW.date, minutes: 900 },
    });
    expect(sale.customerId).toBe(appointment.customerId);
    const [after] = await handle.db.select().from(appointments).where(eq(appointments.id, appointment.id));
    expect(after.status).toBe("COMPLETED");
    const events = await handle.db.select().from(appointmentEvents).where(eq(appointmentEvents.appointmentId, appointment.id));
    expect(events.some((e) => e.type === "COMPLETED" && e.message?.includes(`bon ${sale.number}`))).toBe(true);

    expect(await listUnpaidAppointments(NOW.date)).toEqual([]);
    await expect(checkout(walkIn({ appointmentId: appointment.id }), { now: NOW })).rejects.toThrow(/al afgerekend/);
  });

  it("keeps an appointment that is paid before it ends in the agenda", async () => {
    const appointment = await approvedAppointment();
    await checkout(walkIn({ appointmentId: appointment.id, barberId: null }), { now: NOW });
    const [after] = await handle.db.select().from(appointments).where(eq(appointments.id, appointment.id));
    expect(after.status).toBe("APPROVED");
    expect(await listUnpaidAppointments(NOW.date)).toEqual([]);
  });

  it("only sells products that are in stock, and counts stock down", async () => {
    await expect(
      checkout(walkIn({ items: [{ kind: "PRODUCT", id: waxId, quantity: 4, unitPriceCents: 1495 }] }), { now: NOW }),
    ).rejects.toThrow(/Niet genoeg voorraad van Wax/);
    await checkout(walkIn({ items: [{ kind: "PRODUCT", id: waxId, quantity: 2, unitPriceCents: 1495 }] }), { now: NOW });
    const [wax] = await handle.db.select().from(products).where(eq(products.id, waxId));
    expect(wax.stock).toBe(1);
  });

  it("undoes a receipt once with a refund receipt and restocks", async () => {
    const sale = await checkout(
      walkIn({
        items: [
          { kind: "SERVICE", id: knippenId, quantity: 1, unitPriceCents: 2500 },
          { kind: "PRODUCT", id: waxId, quantity: 1, unitPriceCents: 1495 },
        ],
        discount: { type: "percent", percent: 10 },
        tipCents: 200,
      }),
      { now: NOW },
    );
    const refund = await refundSale(sale.id, { reason: "Verkeerd aangeslagen", userId: null }, { now: NOW });
    expect(refund).toMatchObject({
      kind: "REFUND",
      refundOfId: sale.id,
      number: sale.number + 1,
      totalCents: -sale.totalCents,
      tipCents: -200,
    });
    const [wax] = await handle.db.select().from(products).where(eq(products.id, waxId));
    expect(wax.stock).toBe(3);
    expect((await getSale(sale.id))?.refundedBy?.number).toBe(refund.number);

    await expect(refundSale(sale.id, { reason: "Nog eens", userId: null }, { now: NOW })).rejects.toThrow(/al teruggedraaid/);
    await expect(refundSale(refund.id, { reason: "Terug", userId: null }, { now: NOW })).rejects.toThrow(/tegenboeking/);

    // Sale and refund cancel each other out.
    const summary = await salesSummary(NOW.date, NOW.date);
    expect(summary).toMatchObject({ receipts: 1, refunds: 1, revenueCents: 0, tipsCents: 0, receivedCents: 0 });
  });

  it("lets the owner remove a receipt: it stops counting but stays on record", async () => {
    const appointment = await approvedAppointment();
    const paid = await checkout(
      walkIn({
        appointmentId: appointment.id,
        barberId: null,
        items: [
          { kind: "SERVICE", id: knippenId, quantity: 1, unitPriceCents: 2500 },
          { kind: "PRODUCT", id: waxId, quantity: 2, unitPriceCents: 1495 },
        ],
      }),
      { now: NOW },
    );
    const stock = async () => (await handle.db.select().from(products).where(eq(products.id, waxId)))[0].stock;
    expect(await stock()).toBe(1);

    expect(await deleteSale(paid.id, { reason: "Testbon", userId: null })).toEqual([paid.number]);
    expect(await stock()).toBe(3);
    expect(await listSales(NOW.date, NOW.date)).toEqual([]);
    expect(await salesSummary(NOW.date, NOW.date)).toMatchObject({ receipts: 0, revenueCents: 0 });
    expect(await listDeletedSales(NOW.date, NOW.date)).toMatchObject([{ number: paid.number, deleteReason: "Testbon" }]);
    // The appointment can be paid again, and numbers are never reused.
    expect((await listUnpaidAppointments(NOW.date)).map((a) => a.id)).toEqual([appointment.id]);
    const again = await checkout(walkIn({ appointmentId: appointment.id, barberId: null }), { now: NOW });
    expect(again.number).toBe(paid.number + 1);
    await expect(deleteSale(paid.id, { reason: "Nog eens", userId: null })).rejects.toThrow(/al verwijderd/);
    await expect(refundSale(paid.id, { reason: "x", userId: null }, { now: NOW })).rejects.toThrow(/verwijderd/);
  });

  it("removes a refund together with its sale, or on its own", async () => {
    const sale = await checkout(walkIn({ items: [{ kind: "PRODUCT", id: waxId, quantity: 1, unitPriceCents: 1495 }] }), { now: NOW });
    const refund = await refundSale(sale.id, { reason: "Fout", userId: null }, { now: NOW });
    const stock = async () => (await handle.db.select().from(products).where(eq(products.id, waxId)))[0].stock;
    expect(await stock()).toBe(3);

    // Removing only the refund: the sale counts again and the product leaves stock again.
    await deleteSale(refund.id, { reason: "Tegenboeking was onnodig", userId: null });
    expect(await stock()).toBe(2);
    expect((await getSale(sale.id))?.refundedBy).toBeNull();
    expect(await salesSummary(NOW.date, NOW.date)).toMatchObject({ receipts: 1, refunds: 0, revenueCents: 1495 });

    // A sale with a refund: both go, stock stays as it was.
    const second = await refundSale(sale.id, { reason: "Toch terug", userId: null }, { now: NOW });
    expect(await stock()).toBe(3);
    expect(await deleteSale(sale.id, { reason: "Test", userId: null })).toEqual([sale.number, second.number]);
    expect(await stock()).toBe(3);
    expect(await salesSummary(NOW.date, NOW.date)).toMatchObject({ receipts: 0, refunds: 0, revenueCents: 0 });
  });

  it("wipes a removed receipt for good, and never hands its number out again", async () => {
    const first = await checkout(walkIn(), { now: NOW });
    const last = await checkout(walkIn({ items: [{ kind: "PRODUCT", id: waxId, quantity: 1, unitPriceCents: 1495 }] }), { now: NOW });
    const refund = await refundSale(last.id, { reason: "Fout", userId: null }, { now: NOW });

    await expect(purgeSale(last.id)).rejects.toThrow(/eerst/);
    await deleteSale(last.id, { reason: "Test", userId: null });
    expect(await purgeSale(last.id)).toEqual([last.number, refund.number]);

    expect(await getSale(last.id)).toBeNull();
    expect(await getSale(refund.id)).toBeNull();
    expect(await listDeletedSales(NOW.date, NOW.date)).toEqual([]);
    expect((await listSales(NOW.date, NOW.date)).map((s) => s.number)).toEqual([first.number]);
    // Stock was already put back when it was removed, and stays that way.
    expect((await handle.db.select().from(products).where(eq(products.id, waxId)))[0].stock).toBe(3);
    // The wiped numbers are gone for good: the next receipt continues after them.
    const next = await checkout(walkIn(), { now: NOW });
    expect(next.number).toBe(refund.number + 1);
    await expect(purgeSale(last.id)).rejects.toThrow(/bestaat niet/);
  });

  it("summarises a day and keeps tips out of revenue", async () => {
    await checkout(walkIn({ tipCents: 500 }), { now: NOW }); // cash €30
    await checkout(
      walkIn({ items: [{ kind: "PRODUCT", id: waxId, quantity: 1, unitPriceCents: 1495 }], paymentMethod: "CARD" }),
      { now: NOW },
    );
    const summary = await salesSummary(NOW.date, NOW.date);
    expect(summary).toMatchObject({ receipts: 2, revenueCents: 3995, tipsCents: 500, receivedCents: 4495 });
    expect(summary.byMethod).toEqual({ CASH: 3000, CARD: 1495, OTHER: 0 });
    expect(summary.vat).toEqual([
      { rate: 21, grossCents: 1495, vatCents: 259, netCents: 1236 },
      { rate: 9, grossCents: 2500, vatCents: 206, netCents: 2294 },
    ]);
    expect(summary.byBarber).toEqual([{ barberName: "Rayan", revenueCents: 3995 }]);
  });

  it("records the cash count against the cash receipts of the day", async () => {
    await checkout(walkIn({ tipCents: 500 }), { now: NOW });
    await saveCashCount(NOW.date, { floatCents: 5000, countedCents: 8000, note: null, userId: null }, { now: NOW });
    expect(await getCashCount(NOW.date)).toMatchObject({ floatCents: 5000, cashSalesCents: 3000, countedCents: 8000 });
    await expect(
      saveCashCount("2026-10-06", { floatCents: 0, countedCents: 0, note: null, userId: null }, { now: NOW }),
    ).rejects.toThrow(/vooruit/);
  });

  it("e-mails the receipt with lines, total and VAT", async () => {
    const sale = await checkout(
      walkIn({ discount: { type: "amount", cents: 500 }, tipCents: 100, paymentMethod: "CARD" }),
      { now: NOW },
    );
    expect(await sendReceipt(sale.id, "klant@example.com")).toMatchObject({ ok: true });
    const [log] = await handle.db.select().from(emailLog).where(eq(emailLog.template, "receipt"));
    expect(log).toMatchObject({ recipient: "klant@example.com", subject: "Je kassabon van RKM Barbershop" });
    // The text version is what gets logged in development; check the content through the template.
    const { receiptEmail } = await import("@/emails/templates");
    const settings = (await import("@/server/services/settings")).loadSettings;
    const detail = (await getSale(sale.id))!;
    const mail = receiptEmail({
      settings: { ...(await settings()), kvkNumber: "12345678", vatNumber: "NL000099998B57" },
      number: sale.number,
      isRefund: false,
      createdAt: sale.createdAt,
      barberName: "Rayan",
      paymentMethod: "CARD",
      receipt: { ...detail.sale, lines: detail.lines },
    });
    const text = mail.text.replace(/\u00a0/g, " ");
    expect(text).toContain("1× Knippen: € 25,00");
    expect(text).toContain("Korting: € -5,00");
    expect(text).toContain("Fooi: € 1,00");
    expect(text).toContain("Totaal: € 21,00");
    expect(text).toContain("Btw 9% over € 20,00: € 1,65");
    expect(text).toContain("Betaald met: Pin");
    expect(text).toContain("KvK 12345678 · Btw NL000099998B57");
  });

  it("lets the owner remove a cash count, count the day again, and wipe the removed one", async () => {
    const counted = await saveCashCount(NOW.date, { floatCents: 5000, countedCents: 5000, note: null, userId: null }, { now: NOW });
    await expect(purgeCashCount(counted.id)).rejects.toThrow(/eerst/);

    await deleteCashCount(counted.id, { reason: "Verkeerd geteld", userId: null });
    expect(await getCashCount(NOW.date)).toBeNull();
    expect(await listCashCounts()).toEqual([]);
    expect(await listDeletedCashCounts()).toMatchObject([{ id: counted.id, deleteReason: "Verkeerd geteld" }]);
    await expect(deleteCashCount(counted.id, { reason: "Nog eens", userId: null })).rejects.toThrow(/al verwijderd/);

    // The day can be counted again; the removed count stays on record next to it.
    const recount = await saveCashCount(NOW.date, { floatCents: 5000, countedCents: 5200, note: null, userId: null }, { now: NOW });
    expect(recount.id).not.toBe(counted.id);
    expect(await getCashCount(NOW.date)).toMatchObject({ id: recount.id, countedCents: 5200 });
    // Counting again the same day updates that count instead of adding one.
    await saveCashCount(NOW.date, { floatCents: 5000, countedCents: 5100, note: null, userId: null }, { now: NOW });
    expect((await listCashCounts()).map((c) => [c.id, c.countedCents])).toEqual([[recount.id, 5100]]);

    await purgeCashCount(counted.id);
    expect(await listDeletedCashCounts()).toEqual([]);
    expect(await getCashCount(NOW.date)).toMatchObject({ id: recount.id });
  });

  it("exports receipt lines for the accountant", async () => {
    await checkout(walkIn({ tipCents: 150, note: 'Klant zei: "top"' }), { now: NOW });
    const csv = await exportSalesCsv(NOW.date, NOW.date);
    const lines = csv.replace("\uFEFF", "").trim().split("\r\n");
    expect(lines[0]).toContain("Bonnummer;Soort;Datum");
    expect(lines[1]).toMatch(/;Verkoop;2026-10-05;\d\d:\d\d;Knippen;1;25,00;9;0,00;25,00;2,06;Contant;Rayan$/);
    expect(lines[2]).toContain("Fooi (geen omzet)");
    expect(lines[2]).toContain(";1,50;");
  });
});
