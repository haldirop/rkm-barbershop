import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { dueForVisit, heatmapCounts, isoWeekNumber, median, newVsReturning, percentChange, rhythmLabel, visitRhythms } from "@/lib/insights";
import type { ZonedNow } from "@/lib/time";
import { openDatabase, setDb, type DatabaseHandle } from "@/server/db/client";
import { appointments, barbers, customers, products, sales, services } from "@/server/db/schema";
import { seedBaseData } from "@/server/db/seed";
import {
  busyTimes,
  customerInsights,
  noShowInsights,
  occupancy,
  productInsights,
  revenueOverview,
  revenueSeries,
} from "@/server/services/insights";
import { checkout, type CheckoutInput } from "@/server/services/pos";

describe("insight calculations", () => {
  it("compares with a previous period", () => {
    expect(percentChange(125, 100)).toBe(25);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(10, 0)).toBeNull();
    expect(median([7, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it("splits customers per month into new and returning", () => {
    const visits = [
      { customerId: "a", date: "2026-08-10" },
      { customerId: "a", date: "2026-09-12" },
      { customerId: "a", date: "2026-09-30" },
      { customerId: "b", date: "2026-09-05" },
    ];
    expect(newVsReturning(visits, ["2026-08-01", "2026-09-01"])).toEqual([
      { month: "2026-08-01", newCustomers: 1, returning: 0 },
      { month: "2026-09-01", newCustomers: 1, returning: 1 },
    ]);
  });

  it("finds regular customers who are later than usual and have nothing planned", () => {
    const rhythms = visitRhythms([
      // Every 4 weeks, last visit 10 weeks ago: due.
      { customerId: "late", date: "2026-06-01" },
      { customerId: "late", date: "2026-06-29" },
      { customerId: "late", date: "2026-07-27" },
      // Every 4 weeks, last visit 3 weeks ago: not yet.
      { customerId: "fine", date: "2026-08-24" },
      { customerId: "fine", date: "2026-09-14" },
      // Late too, but already booked.
      { customerId: "booked", date: "2026-06-01" },
      { customerId: "booked", date: "2026-07-01" },
      // One visit: no rhythm yet.
      { customerId: "once", date: "2026-05-01" },
    ]);
    expect(rhythms.find((r) => r.customerId === "late")).toMatchObject({ visits: 3, averageGapDays: 28 });
    const due = dueForVisit(rhythms, "2026-10-05", { planned: new Set(["booked"]) });
    expect(due.map((d) => d.customerId)).toEqual(["late"]);
    expect(due[0]).toMatchObject({ daysSince: 70, overdueDays: 42 });
  });

  it("labels weeks and rhythms", () => {
    expect(isoWeekNumber("2026-10-05")).toBe(41);
    expect(isoWeekNumber("2027-01-01")).toBe(53);
    expect(isoWeekNumber("2026-01-01")).toBe(1);
    expect(rhythmLabel(28)).toBe("elke 4 weken");
    expect(rhythmLabel(10)).toBe("elke 10 dagen");
  });

  it("counts per weekday and hour", () => {
    const counts = heatmapCounts([
      { weekday: 6, hour: 10 },
      { weekday: 6, hour: 10 },
      { weekday: 1, hour: 9 },
    ]);
    expect(counts.get("6-10")).toBe(2);
    expect(counts.get("1-9")).toBe(1);
  });
});

// Thursday 8 October 2026, 18:00.
const NOW: ZonedNow = { date: "2026-10-08", minutes: 18 * 60 };

let handle: DatabaseHandle;
let knippenId: string;
let rayanId: string;
let milanId: string;

beforeAll(async () => {
  handle = openDatabase({ kind: "pglite", dataDir: undefined });
  await handle.migrate();
  await seedBaseData(handle.db);
  setDb(handle.db);
  knippenId = (await handle.db.select().from(services).where(eq(services.name, "Knippen")))[0].id;
  const barberRows = await handle.db.select().from(barbers);
  rayanId = barberRows.find((b) => b.name === "Rayan")!.id;
  milanId = barberRows.find((b) => b.name === "Milan")!.id;
});

beforeEach(async () => {
  await handle.db.delete(sales).where(eq(sales.kind, "REFUND"));
  await handle.db.delete(sales);
  await handle.db.delete(products);
  await handle.db.delete(appointments);
  await handle.db.delete(customers);
});

afterAll(async () => {
  setDb(undefined);
  await handle.close();
});

const sell = (date: string, cents: number, extra: Partial<CheckoutInput> = {}) =>
  checkout(
    {
      appointmentId: null,
      customerId: null,
      barberId: rayanId,
      items: [{ kind: "SERVICE", id: knippenId, quantity: 1, unitPriceCents: cents }],
      discount: null,
      tipCents: 0,
      paymentMethod: "CARD",
      note: null,
      userId: null,
      ...extra,
    },
    { now: { date, minutes: 12 * 60 } },
  );

async function customer(name: string) {
  const [row] = await handle.db
    .insert(customers)
    .values({ firstName: name, lastName: "Test", phone: "0612345678", email: `${name.toLowerCase()}@example.com` })
    .returning();
  return row;
}

async function visit(
  customerId: string,
  date: string,
  status: "COMPLETED" | "APPROVED" | "NO_SHOW" | "PENDING" | "CANCELLED" = "COMPLETED",
  start = "10:00",
  barberId = rayanId,
) {
  const end = `${String(Number(start.slice(0, 2))).padStart(2, "0")}:30`;
  const [row] = await handle.db
    .insert(appointments)
    .values({
      customerId,
      barberId,
      serviceId: knippenId,
      barberName: barberId === rayanId ? "Rayan" : "Milan",
      serviceName: "Knippen",
      priceCents: 2500,
      durationMinutes: 30,
      date,
      startTime: start,
      endTime: end,
      status,
      source: "ADMIN",
    })
    .returning();
  return row;
}

describe("insights from the database", () => {
  it("compares revenue with the same stretch of the previous period", async () => {
    await sell("2026-10-08", 3000); // today
    await sell("2026-10-01", 2000); // same weekday last week
    await sell("2026-10-05", 1000); // Monday this week
    await sell("2026-09-03", 4000); // early last month
    await sell("2026-09-20", 9900); // later last month: outside the comparison
    await sell("2026-10-02", 500, { tipCents: 200 }); // tip is not revenue

    const overview = await revenueOverview(NOW);
    expect(overview.today).toMatchObject({ current: { revenueCents: 3000 }, previous: { revenueCents: 2000 }, change: 50 });
    expect(overview.week.current.revenueCents).toBe(4000); // Mon 5 – Thu 8
    expect(overview.week.previous.revenueCents).toBe(2000); // Mon 28 Sep – Thu 1 Oct
    expect(overview.month.current.revenueCents).toBe(6500); // 1–8 Oct
    expect(overview.month.previous.revenueCents).toBe(4000); // 1–8 Sep
    expect(overview.averageReceipt.current).toBe(Math.round(6500 / 4));

    const weeks = await revenueSeries("week", 3, NOW);
    expect(weeks).toEqual([
      { start: "2026-09-21", revenueCents: 0 },
      { start: "2026-09-28", revenueCents: 2500 },
      { start: "2026-10-05", revenueCents: 4000 },
    ]);
    const months = await revenueSeries("month", 2, NOW);
    expect(months).toEqual([
      { start: "2026-09-01", revenueCents: 13900 },
      { start: "2026-10-01", revenueCents: 6500 },
    ]);
  });

  it("shows busy times from visits and walk-ins", async () => {
    const jan = await customer("Jan");
    await visit(jan.id, "2026-10-03", "COMPLETED", "10:00"); // Saturday 10:00
    await visit(jan.id, "2026-09-26", "COMPLETED", "10:00"); // Saturday 10:00
    await visit(jan.id, "2026-10-06", "NO_SHOW", "11:00"); // a no-show isn't a visit
    const walkIn = await sell("2026-10-07", 2500); // paid at the till
    await handle.db.update(sales).set({ createdAt: new Date("2026-10-07T13:20:00+02:00") }).where(eq(sales.id, walkIn.id));
    const late = await sell("2026-10-04", 2500); // entered on a Sunday night
    await handle.db.update(sales).set({ createdAt: new Date("2026-10-04T23:40:00+02:00") }).where(eq(sales.id, late.id));

    const busy = await busyTimes("2026-09-01", "2026-10-08", NOW);
    expect(busy.counts["6-10"]).toBe(2);
    expect(busy.counts["3-13"]).toBe(1); // Wednesday 13:00
    expect(busy.counts["2-11"]).toBeUndefined();
    expect(busy.max).toBe(2);
    expect(busy.total).toBe(3);
    // Columns follow the opening hours; the late receipt doesn't stretch them to midnight.
    expect(busy.hours[0]).toBe(9);
    expect(busy.hours.at(-1)).toBe(19);
    expect(busy.outsideHours).toBe(1);
    expect(busy.openHours[1]).toEqual([9, 17]); // Monday 09:00–18:00
    expect(busy.openHours[7]).toBeUndefined(); // closed on Sunday
    expect(busy.weekdays).toEqual([1, 2, 3, 4, 5, 6]); // open days of the seeded shop
  });

  it("measures occupancy against working time", async () => {
    const jan = await customer("Jan");
    await visit(jan.id, "2026-10-08", "COMPLETED", "10:00", rayanId);
    await visit(jan.id, "2026-10-08", "NO_SHOW", "11:00", milanId); // the chair was held
    await visit(jan.id, "2026-10-08", "CANCELLED", "12:00", rayanId); // freed again
    const result = await occupancy("2026-10-08", "2026-10-08");
    expect(result.bookedMinutes).toBe(60);
    expect(result.capacityMinutes).toBeGreaterThan(600); // two barbers on a Thursday
    expect(result.percent).toBe(Math.round((60 / result.capacityMinutes) * 100));
    expect(result.byWeekday).toEqual([{ weekday: 4, percent: result.percent }]);
    expect(result.byDay).toEqual([{ date: "2026-10-08", percent: result.percent }]);
  });

  it("knows the customers: new vs returning, who is due, and the best customers", async () => {
    const regular = await customer("Vaste");
    for (const date of ["2026-06-01", "2026-06-29", "2026-07-27"]) await visit(regular.id, date);
    const newbie = await customer("Nieuw");
    await visit(newbie.id, "2026-10-02");
    const planned = await customer("Gepland");
    for (const date of ["2026-06-02", "2026-07-02"]) await visit(planned.id, date);
    await visit(planned.id, "2026-10-20", "APPROVED");
    await sell("2026-07-27", 4500, { customerId: regular.id });

    const insights = await customerInsights(NOW);
    expect(insights.months.at(-1)).toEqual({ month: "2026-10-01", newCustomers: 1, returning: 0 });
    expect(insights.months.find((m) => m.month === "2026-07-01")).toEqual({ month: "2026-07-01", newCustomers: 0, returning: 2 });
    expect(insights.regulars).toBe(2);
    expect(insights.due.map((d) => d.firstName)).toEqual(["Vaste"]);
    expect(insights.due[0]).toMatchObject({ phone: "0612345678", averageGapDays: 28 });
    expect(insights.top[0]).toMatchObject({ firstName: "Vaste", visits: 3, spentCents: 4500 });
  });

  it("calculates the no-show rate and who misses more often", async () => {
    const jan = await customer("Jan");
    const piet = await customer("Piet");
    await visit(jan.id, "2026-09-10", "NO_SHOW");
    await visit(jan.id, "2026-09-24", "NO_SHOW");
    await visit(piet.id, "2026-09-11", "NO_SHOW");
    for (const date of ["2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-22", "2026-09-23"]) {
      await visit(piet.id, date, "COMPLETED");
    }
    const result = await noShowInsights(90, NOW);
    expect(result).toMatchObject({ noShows: 3, expected: 10, percent: 30 });
    expect(result.frequent.map((f) => [f.firstName, f.noShows])).toEqual([["Jan", 2]]);
  });

  it("lists best-selling products and the ones running out", async () => {
    const [wax] = await handle.db.insert(products).values({ name: "Wax", priceCents: 1495, stock: 10, lowStockAt: 3 }).returning();
    const [olie] = await handle.db.insert(products).values({ name: "Baardolie", priceCents: 1995, stock: 5, lowStockAt: 2 }).returning();
    await handle.db.insert(products).values({ name: "Kam", priceCents: 500, stock: null });
    await sell("2026-10-01", 0, { items: [{ kind: "PRODUCT", id: wax.id, quantity: 8, unitPriceCents: 1495 }] });
    await sell("2026-10-02", 0, { items: [{ kind: "PRODUCT", id: olie.id, quantity: 1, unitPriceCents: 1995 }] });

    const result = await productInsights(90, NOW);
    expect(result.bestSellers.map((b) => [b.name, b.quantity])).toEqual([
      ["Wax", 8],
      ["Baardolie", 1],
    ]);
    expect(result.attention).toEqual([{ id: wax.id, name: "Wax", stock: 2, lowStockAt: 3, status: "low" }]);
  });
});
