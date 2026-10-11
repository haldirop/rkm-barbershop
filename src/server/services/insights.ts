import "server-only";
import { and, desc, eq, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { workingIntervals } from "@/lib/availability";
import { dueForVisit, heatmapCounts, median, newVsReturning, percentChange, visitRhythms, type Visit } from "@/lib/insights";
import { stockStatus } from "@/lib/pos";
import {
  addDays,
  addMonths,
  eachDay,
  endOfMonth,
  isoWeekday,
  startOfMonth,
  startOfWeek,
  timeToMinutes,
  zonedNow,
  type IsoDate,
  type ZonedNow,
} from "@/lib/time";
import { getDb, type DbOrTx } from "@/server/db/client";
import { appointments, customers, products, saleLines, sales } from "@/server/db/schema";
import { buildDay, loadSchedule } from "./availability";
import { listBusinessHours, listProducts } from "./catalog";
import { countWaitingByDate } from "./waitlist";

/**
 * Figures that give the owner a picture of the business: revenue (from the till),
 * busy times, occupancy, customers, no-shows and products.
 */

const activeSale = isNull(sales.deletedAt);
const num = (expression: ReturnType<typeof sql>) => sql<number>`COALESCE(${expression}, 0)`.mapWith(Number);

// ---------------------------------------------------------------------------
// Omzet (kassa)
// ---------------------------------------------------------------------------

export interface RevenueTotals {
  /** Paid, including VAT, without tips; refunds subtracted. */
  revenueCents: number;
  /** Sales minus refunds. */
  receipts: number;
  tipsCents: number;
}

export async function revenueTotals(from: IsoDate, to: IsoDate, db: DbOrTx = getDb()): Promise<RevenueTotals> {
  const [row] = await db
    .select({
      revenueCents: num(sql`SUM(${sales.totalCents} - ${sales.tipCents})`),
      receipts: num(sql`COUNT(*) FILTER (WHERE ${sales.kind} = 'SALE') - COUNT(*) FILTER (WHERE ${sales.kind} = 'REFUND')`),
      tipsCents: num(sql`SUM(${sales.tipCents})`),
    })
    .from(sales)
    .where(and(gte(sales.date, from), lte(sales.date, to), activeSale));
  return row;
}

const average = (t: RevenueTotals) => (t.receipts > 0 ? Math.round(t.revenueCents / t.receipts) : 0);

function compare(current: RevenueTotals, previous: RevenueTotals) {
  return {
    current,
    previous,
    change: percentChange(current.revenueCents, previous.revenueCents),
  };
}

/**
 * Today, this week and this month so far, each against the same stretch one period
 * earlier (today vs the same weekday last week; Monday–today vs last week's Monday–same
 * day; the 1st–today vs the same days last month).
 */
export async function revenueOverview(now: ZonedNow = zonedNow(), db: DbOrTx = getDb()) {
  const today = now.date;
  const weekStart = startOfWeek(today);
  const monthStart = startOfMonth(today);
  const lastMonthStart = addMonths(monthStart, -1);
  const dayOfMonth = Number(today.slice(8));
  const lastMonthSameDay = [addDays(lastMonthStart, dayOfMonth - 1), endOfMonth(lastMonthStart)].sort()[0];

  const [day, dayBefore, week, weekBefore, month, monthBefore] = await Promise.all([
    revenueTotals(today, today, db),
    revenueTotals(addDays(today, -7), addDays(today, -7), db),
    revenueTotals(weekStart, today, db),
    revenueTotals(addDays(weekStart, -7), addDays(today, -7), db),
    revenueTotals(monthStart, today, db),
    revenueTotals(lastMonthStart, lastMonthSameDay, db),
  ]);
  return {
    today: compare(day, dayBefore),
    week: compare(week, weekBefore),
    month: compare(month, monthBefore),
    averageReceipt: {
      current: average(month),
      previous: average(monthBefore),
      change: percentChange(average(month), average(monthBefore)),
    },
  };
}

export type RevenueOverview = Awaited<ReturnType<typeof revenueOverview>>;

/** Revenue per week (Monday-start) or per month, the last `count` periods up to today. */
export async function revenueSeries(kind: "week" | "month", count: number, now: ZonedNow = zonedNow(), db: DbOrTx = getDb()) {
  const starts = Array.from({ length: count }, (_, i) =>
    kind === "week" ? addDays(startOfWeek(now.date), -7 * (count - 1 - i)) : addMonths(startOfMonth(now.date), -(count - 1 - i)),
  );
  const rows = await db
    .select({ date: sales.date, revenueCents: num(sql`SUM(${sales.totalCents} - ${sales.tipCents})`) })
    .from(sales)
    .where(and(gte(sales.date, starts[0]), lte(sales.date, now.date), activeSale))
    .groupBy(sales.date);
  const totals = new Map(starts.map((s) => [s, 0]));
  for (const row of rows) {
    const bucket = kind === "week" ? startOfWeek(row.date) : startOfMonth(row.date);
    if (totals.has(bucket)) totals.set(bucket, totals.get(bucket)! + row.revenueCents);
  }
  return starts.map((start) => ({ start, revenueCents: totals.get(start)! }));
}

/** The first day the till was used (charts start there). */
export async function firstSaleDate(db: DbOrTx = getDb()): Promise<IsoDate | null> {
  const [row] = await db.select({ date: sql<string | null>`MIN(${sales.date})` }).from(sales).where(activeSale);
  return row?.date ?? null;
}

// ---------------------------------------------------------------------------
// Drukte en bezetting
// ---------------------------------------------------------------------------

/** Appointments that took place: completed, or confirmed and in the past. */
function tookPlace(today: IsoDate) {
  return or(eq(appointments.status, "COMPLETED"), and(eq(appointments.status, "APPROVED"), lt(appointments.date, today)));
}

const shopClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Amsterdam",
  weekday: "short",
  hour: "2-digit",
  hourCycle: "h23",
});
const WEEKDAY_NUMBER: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function shopWeekdayHour(moment: Date) {
  const parts = Object.fromEntries(shopClock.formatToParts(moment).map((p) => [p.type, p.value]));
  return { weekday: WEEKDAY_NUMBER[parts.weekday], hour: Number(parts.hour) };
}

/**
 * Customers per weekday and hour over a period: appointments that took place (by start
 * time) plus walk-ins paid at the till without an appointment (by time of payment).
 */
export async function busyTimes(from: IsoDate, to: IsoDate, now: ZonedNow = zonedNow(), db: DbOrTx = getDb()) {
  const [visits, walkIns, hours] = await Promise.all([
    db
      .select({ date: appointments.date, startTime: appointments.startTime })
      .from(appointments)
      .where(and(gte(appointments.date, from), lte(appointments.date, to), tookPlace(now.date))),
    db
      .select({ createdAt: sales.createdAt })
      .from(sales)
      .where(and(gte(sales.date, from), lte(sales.date, to), eq(sales.kind, "SALE"), isNull(sales.appointmentId), activeSale)),
    listBusinessHours(db),
  ]);
  const all = [
    ...visits.map((v) => ({ weekday: isoWeekday(v.date), hour: Math.floor(timeToMinutes(v.startTime) / 60) })),
    ...walkIns.map((w) => shopWeekdayHour(w.createdAt)),
  ];

  // Columns: the opening hours. A receipt entered late at night would otherwise stretch
  // the grid to midnight; such moments are counted separately.
  const open = hours.filter((h) => h.isOpen);
  const firstHour = open.length
    ? Math.min(...open.map((h) => Math.floor(timeToMinutes(h.openTime) / 60)))
    : Math.min(...all.map((p) => p.hour));
  const lastHour = open.length
    ? Math.max(...open.map((h) => Math.ceil(timeToMinutes(h.closeTime) / 60) - 1))
    : Math.max(...all.map((p) => p.hour));
  const hourList = Number.isFinite(firstHour) ? Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i) : [];
  const points = all.filter((p) => p.hour >= firstHour && p.hour <= lastHour);
  const counts = heatmapCounts(points);

  // Rows: the days the shop is open, plus any other day with customers.
  const weekdays = [...new Set([...open.map((h) => h.weekday), ...points.map((p) => p.weekday)])].sort((a, b) => a - b);
  const openHours = Object.fromEntries(
    open.map((h) => [h.weekday, [Math.floor(timeToMinutes(h.openTime) / 60), Math.ceil(timeToMinutes(h.closeTime) / 60) - 1]]),
  ) as Record<number, [number, number]>;
  return {
    weekdays,
    hours: hourList,
    openHours,
    counts: Object.fromEntries(counts) as Record<string, number>,
    max: Math.max(0, ...counts.values()),
    total: points.length,
    outsideHours: all.length - points.length,
  };
}

export type BusyTimes = Awaited<ReturnType<typeof busyTimes>>;

/**
 * Booked time as a share of working time (opening hours × barbers, minus breaks and
 * blocks). Past days count what took place or was missed; future days what is planned.
 */
export async function occupancy(from: IsoDate, to: IsoDate, db: DbOrTx = getDb()) {
  const [schedule, booked] = await Promise.all([
    loadSchedule(from, to, db),
    db
      .select({ date: appointments.date, startTime: appointments.startTime, endTime: appointments.endTime })
      .from(appointments)
      .where(
        and(
          gte(appointments.date, from),
          lte(appointments.date, to),
          inArray(appointments.status, ["PENDING", "APPROVED", "COMPLETED", "NO_SHOW"]),
        ),
      ),
  ]);
  const bookedPerDay = new Map<IsoDate, number>();
  for (const b of booked) {
    bookedPerDay.set(b.date, (bookedPerDay.get(b.date) ?? 0) + timeToMinutes(b.endTime) - timeToMinutes(b.startTime));
  }
  const days = eachDay(from, to).map((date) => {
    const day = buildDay(schedule, date);
    const capacity = day.barbers.reduce(
      (sum, barber) => sum + workingIntervals(day, barber).reduce((s, iv) => s + iv.end - iv.start, 0),
      0,
    );
    return { date, capacity, booked: Math.min(capacity, bookedPerDay.get(date) ?? 0) };
  });
  const share = (items: typeof days) => {
    const capacity = items.reduce((s, d) => s + d.capacity, 0);
    return capacity ? Math.round((items.reduce((s, d) => s + d.booked, 0) / capacity) * 100) : null;
  };
  const weekdays = [...new Set(days.filter((d) => d.capacity > 0).map((d) => isoWeekday(d.date)))].sort((a, b) => a - b);
  return {
    percent: share(days),
    bookedMinutes: days.reduce((s, d) => s + d.booked, 0),
    capacityMinutes: days.reduce((s, d) => s + d.capacity, 0),
    byWeekday: weekdays.map((weekday) => ({ weekday, percent: share(days.filter((d) => isoWeekday(d.date) === weekday)) ?? 0 })),
    byDay: days.filter((d) => d.capacity > 0).map((d) => ({ date: d.date, percent: Math.round((d.booked / d.capacity) * 100) })),
  };
}

/** People on the waiting list for fully booked days from today: a sign of demand. */
export async function waitlistDemand(now: ZonedNow = zonedNow(), db: DbOrTx = getDb()) {
  const days = await countWaitingByDate(now.date, addDays(now.date, 120), db);
  return { people: days.reduce((s, d) => s + d.waiting, 0), days };
}

// ---------------------------------------------------------------------------
// Klanten
// ---------------------------------------------------------------------------

export async function customerInsights(now: ZonedNow = zonedNow(), db: DbOrTx = getDb()) {
  const today = now.date;
  const yearAgo = addMonths(startOfMonth(today), -11);
  const [visitRows, plannedRows, spendRows] = await Promise.all([
    db
      .select({ customerId: appointments.customerId, date: appointments.date })
      .from(appointments)
      .where(tookPlace(today)),
    db
      .selectDistinct({ customerId: appointments.customerId })
      .from(appointments)
      .where(and(gte(appointments.date, today), inArray(appointments.status, ["PENDING", "APPROVED"]))),
    db
      .select({ customerId: sales.customerId, spentCents: num(sql`SUM(${sales.totalCents} - ${sales.tipCents})`) })
      .from(sales)
      .where(and(gte(sales.date, yearAgo), activeSale, sql`${sales.customerId} IS NOT NULL`))
      .groupBy(sales.customerId),
  ]);
  const visits: Visit[] = visitRows;
  const months = Array.from({ length: 6 }, (_, i) => addMonths(startOfMonth(today), i - 5));
  const rhythms = visitRhythms(visits);
  const regulars = rhythms.filter((r) => r.averageGapDays !== null);
  const due = dueForVisit(rhythms, today, { planned: new Set(plannedRows.map((r) => r.customerId)) }).slice(0, 15);

  const visitsThisYear = new Map<string, number>();
  for (const v of visits) {
    if (v.date >= yearAgo) visitsThisYear.set(v.customerId, (visitsThisYear.get(v.customerId) ?? 0) + 1);
  }
  const spent = new Map(spendRows.map((r) => [r.customerId!, r.spentCents]));
  const topIds = [...new Set([...visitsThisYear.keys(), ...spent.keys()])]
    .sort((a, b) => (visitsThisYear.get(b) ?? 0) - (visitsThisYear.get(a) ?? 0) || (spent.get(b) ?? 0) - (spent.get(a) ?? 0))
    .slice(0, 10);

  const ids = [...new Set([...due.map((d) => d.customerId), ...topIds])];
  const people = ids.length
    ? await db
        .select({ id: customers.id, firstName: customers.firstName, lastName: customers.lastName, phone: customers.phone, email: customers.email })
        .from(customers)
        .where(inArray(customers.id, ids))
    : [];
  const person = (id: string) => people.find((p) => p.id === id)!;

  return {
    months: newVsReturning(visits, months),
    activeCustomers: new Set(visits.filter((v) => v.date >= addDays(today, -90)).map((v) => v.customerId)).size,
    regulars: regulars.length,
    medianGapDays: median(regulars.map((r) => r.averageGapDays!)),
    due: due.filter((d) => people.some((p) => p.id === d.customerId)).map((d) => ({ ...d, ...person(d.customerId) })),
    top: topIds
      .filter((id) => people.some((p) => p.id === id))
      .map((id) => ({ ...person(id), visits: visitsThisYear.get(id) ?? 0, spentCents: spent.get(id) ?? 0 })),
  };
}

export type CustomerInsights = Awaited<ReturnType<typeof customerInsights>>;

/** "Niet verschenen" over the last `days` days, and customers who missed more than once. */
export async function noShowInsights(days = 90, now: ZonedNow = zonedNow(), db: DbOrTx = getDb()) {
  const from = addDays(now.date, -days);
  const inPeriod = and(gte(appointments.date, from), lte(appointments.date, now.date));
  const [[totals], frequent] = await Promise.all([
    db
      .select({
        noShows: num(sql`COUNT(*) FILTER (WHERE ${appointments.status} = 'NO_SHOW')`),
        tookPlace: num(
          sql`COUNT(*) FILTER (WHERE ${appointments.status} = 'COMPLETED' OR (${appointments.status} = 'APPROVED' AND ${appointments.date} < ${now.date}))`,
        ),
      })
      .from(appointments)
      .where(inPeriod),
    db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        phone: customers.phone,
        noShows: num(sql`COUNT(*)`),
        lastNoShow: sql<string>`MAX(${appointments.date})`,
      })
      .from(appointments)
      .innerJoin(customers, eq(customers.id, appointments.customerId))
      .where(eq(appointments.status, "NO_SHOW"))
      .groupBy(customers.id)
      .having(sql`COUNT(*) >= 2`)
      .orderBy(desc(sql`COUNT(*)`), desc(sql`MAX(${appointments.date})`))
      .limit(10),
  ]);
  const expected = totals.noShows + totals.tookPlace;
  return {
    days,
    noShows: totals.noShows,
    expected,
    percent: expected ? Math.round((totals.noShows / expected) * 1000) / 10 : null,
    frequent,
  };
}

// ---------------------------------------------------------------------------
// Producten
// ---------------------------------------------------------------------------

export async function productInsights(days = 90, now: ZonedNow = zonedNow(), db: DbOrTx = getDb()) {
  const [bestSellers, all] = await Promise.all([
    db
      .select({
        name: saleLines.name,
        quantity: num(sql`SUM(${saleLines.quantity})`),
        revenueCents: num(sql`SUM(${saleLines.totalCents} - ${saleLines.discountCents})`),
      })
      .from(saleLines)
      .innerJoin(sales, eq(sales.id, saleLines.saleId))
      .where(and(eq(saleLines.kind, "PRODUCT"), gte(sales.date, addDays(now.date, -days)), activeSale))
      .groupBy(saleLines.name)
      .orderBy(desc(sql`SUM(${saleLines.quantity})`), desc(sql`SUM(${saleLines.totalCents})`))
      .limit(10),
    listProducts({ activeOnly: true }, db),
  ]);
  return {
    days,
    bestSellers: bestSellers.filter((b) => b.quantity > 0),
    attention: all
      .map((p) => ({ id: p.id, name: p.name, stock: p.stock, lowStockAt: p.lowStockAt, status: stockStatus(p) }))
      .filter((p) => p.status !== null)
      .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0)),
  };
}

/** Products that are sold out or nearly sold out (for the dashboard). */
export async function lowStockProducts(db: DbOrTx = getDb()) {
  const rows = await db.select().from(products).where(and(eq(products.isActive, true), sql`${products.stock} IS NOT NULL`));
  return rows.filter((p) => stockStatus(p) !== null).sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
}
