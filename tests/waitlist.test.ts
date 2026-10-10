import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, setDb, type DatabaseHandle } from "@/server/db/client";
import { appointments, availabilityAlerts, barbers, blockedTimes, customers, services } from "@/server/db/schema";
import { seedBaseData } from "@/server/db/seed";
import { changeStatus } from "@/server/services/appointments";
import { createBookingRequest } from "@/server/services/booking";
import { createAvailabilityAlert, processAvailabilityAlerts, type FreedUpSpot } from "@/server/services/waitlist";
import type { ZonedNow } from "@/lib/time";

// Monday 5 October 2026, 10:00. On Thursday the 8th Rayan works 09:00–20:00, Milan 10:00–20:00.
const NOW: ZonedNow = { date: "2026-10-05", minutes: 600 };
const THURSDAY = "2026-10-08";

let handle: DatabaseHandle;
let knippenId: string;
let rayanId: string;

beforeAll(async () => {
  handle = openDatabase({ kind: "pglite", dataDir: undefined });
  await handle.migrate();
  await seedBaseData(handle.db);
  setDb(handle.db);
  const [service] = await handle.db.select().from(services).where(eq(services.name, "Knippen"));
  knippenId = service.id;
  rayanId = (await handle.db.select().from(barbers)).find((b) => b.name === "Rayan")!.id;
});

beforeEach(async () => {
  await handle.db.delete(availabilityAlerts);
  await handle.db.delete(appointments);
  await handle.db.delete(customers);
  await handle.db.delete(blockedTimes);
});

afterAll(async () => {
  setDb(undefined);
  await handle.close();
});

/** Rayan is free on Thursday only 14:00–14:30, and that half hour gets booked: his day is full. */
async function fillRayansThursday() {
  await handle.db.insert(blockedTimes).values([
    { barberId: rayanId, startDate: THURSDAY, endDate: THURSDAY, startTime: "08:00", endTime: "14:00" },
    { barberId: rayanId, startDate: THURSDAY, endDate: THURSDAY, startTime: "14:30", endTime: "21:00" },
  ]);
  const { appointment } = await createBookingRequest(
    {
      serviceId: knippenId,
      barberId: rayanId,
      date: THURSDAY,
      startTime: "14:00",
      firstName: "Jan",
      lastName: "Jansen",
      phone: "0612345678",
      email: "jan@example.com",
      notes: null,
    },
    { now: NOW },
  );
  return appointment;
}

const alertFor = (email: string, barberId: string | null = rayanId) => ({
  serviceId: knippenId,
  barberId,
  date: THURSDAY,
  email,
});

function collector() {
  const sent: FreedUpSpot[] = [];
  return { sent, send: async (spot: FreedUpSpot) => (sent.push(spot), { ok: true }) };
}

describe("waiting list for fully booked days", () => {
  it("only accepts sign-ups for days without free times", async () => {
    await expect(createAvailabilityAlert(alertFor("klant@example.com"), { now: NOW })).rejects.toThrow(/nog tijden vrij/);
    await fillRayansThursday();
    // Milan still has room on Thursday, so "geen voorkeur" is not full.
    await expect(createAvailabilityAlert(alertFor("klant@example.com", null), { now: NOW })).rejects.toThrow(
      /nog tijden vrij/,
    );
    await expect(createAvailabilityAlert(alertFor("Klant@Example.com "), { now: NOW })).resolves.toMatchObject({
      email: "klant@example.com",
      notifiedAt: null,
    });
    // Signing up twice doesn't create a second row.
    await createAvailabilityAlert(alertFor("klant@example.com"), { now: NOW });
    expect(await handle.db.select().from(availabilityAlerts)).toHaveLength(1);
  });

  it("e-mails once as soon as a spot frees up", async () => {
    const booked = await fillRayansThursday();
    await createAvailabilityAlert(alertFor("klant@example.com"), { now: NOW });
    await createAvailabilityAlert(alertFor("ander@example.com"), { now: NOW });
    const { sent, send } = collector();

    expect((await processAvailabilityAlerts({ now: NOW, send })).notified).toBe(0);

    await changeStatus(booked.id, "CANCELLED", { userId: null });
    expect((await processAvailabilityAlerts({ now: NOW, send })).notified).toBe(2);
    expect(sent.map((s) => s.alert.email).sort()).toEqual(["ander@example.com", "klant@example.com"]);
    expect(sent[0]).toMatchObject({ serviceName: "Knippen", barberName: "Rayan", times: ["14:00"] });

    // Never a second e-mail for the same sign-up.
    expect((await processAvailabilityAlerts({ now: NOW, send })).notified).toBe(0);
  });

  it("keeps a sign-up on the list when the e-mail could not be sent, and tries again", async () => {
    const booked = await fillRayansThursday();
    await createAvailabilityAlert(alertFor("klant@example.com"), { now: NOW });
    await changeStatus(booked.id, "CANCELLED", { userId: null });

    const refused = async () => ({ ok: false, error: "Resend weigerde de e-mail." });
    expect(await processAvailabilityAlerts({ now: NOW, send: refused })).toMatchObject({ notified: 0, failed: 1 });
    const [waiting] = await handle.db.select().from(availabilityAlerts);
    expect(waiting).toMatchObject({ notifiedAt: null, lastError: "Resend weigerde de e-mail." });

    // A crash while sending counts as a failure too: nobody is left marked as notified without an e-mail.
    const crashing = async (): Promise<never> => {
      throw new Error("Database weg");
    };
    expect(await processAvailabilityAlerts({ now: NOW, send: crashing })).toMatchObject({ notified: 0, failed: 1 });
    expect((await handle.db.select().from(availabilityAlerts))[0].notifiedAt).toBeNull();

    const { sent, send } = collector();
    expect(await processAvailabilityAlerts({ now: NOW, send })).toMatchObject({ notified: 1, failed: 0 });
    expect(sent).toHaveLength(1);
    const [done] = await handle.db.select().from(availabilityAlerts);
    expect(done.notifiedAt).not.toBeNull();
    expect(done.lastError).toBeNull();
  });

  it("removes sign-ups once the day has passed", async () => {
    await fillRayansThursday();
    await createAvailabilityAlert(alertFor("klant@example.com"), { now: NOW });
    const result = await processAvailabilityAlerts({ now: { date: "2026-10-09", minutes: 600 }, send: collector().send });
    expect(result).toEqual({ notified: 0, failed: 0, removed: 1 });
    expect(await handle.db.select().from(availabilityAlerts)).toHaveLength(0);
  });

  it("limits the number of open sign-ups per e-mail address", async () => {
    await fillRayansThursday();
    await handle.db.insert(availabilityAlerts).values(
      ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"].map((date) => ({
        date,
        serviceId: knippenId,
        barberId: rayanId,
        email: "veel@example.com",
      })),
    );
    await expect(createAvailabilityAlert(alertFor("veel@example.com"), { now: NOW })).rejects.toMatchObject({
      code: "LIMIT",
    });
  });
});
