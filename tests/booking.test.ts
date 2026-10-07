import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, setDb, type DatabaseHandle } from "@/server/db/client";
import { appointments, barbers, blockedTimes, customers, services } from "@/server/db/schema";
import { seedBaseData } from "@/server/db/seed";
import { getDayAvailability, getSuggestions } from "@/server/services/availability";
import {
  cancelByCustomer,
  createBookingRequest,
  getAppointmentByToken,
  rescheduleByCustomer,
  type BookingInput,
} from "@/server/services/booking";
import { changeStatus } from "@/server/services/appointments";
import { runScheduledJobs } from "@/server/services/jobs";
import type { ZonedNow } from "@/lib/time";

// Monday 5 October 2026, 10:00. Thursday the 8th: both barbers work 10:00–20:00.
const NOW: ZonedNow = { date: "2026-10-05", minutes: 600 };
const THURSDAY = "2026-10-08";

let handle: DatabaseHandle;
let knippenId: string;
let rayanId: string;
let milanId: string;

function booking(overrides: Partial<BookingInput> = {}): BookingInput {
  return {
    serviceId: knippenId,
    barberId: rayanId,
    date: THURSDAY,
    startTime: "14:00",
    firstName: "Jan",
    lastName: "Jansen",
    phone: "0612345678",
    email: `jan.${Math.random().toString(36).slice(2)}@example.com`,
    notes: null,
    ...overrides,
  };
}

beforeAll(async () => {
  handle = openDatabase({ kind: "pglite", dataDir: undefined });
  await handle.migrate();
  await seedBaseData(handle.db);
  setDb(handle.db);
  const [service] = await handle.db.select().from(services).where(eq(services.name, "Knippen"));
  knippenId = service.id;
  const barberRows = await handle.db.select().from(barbers);
  rayanId = barberRows.find((b) => b.name === "Rayan")!.id;
  milanId = barberRows.find((b) => b.name === "Milan")!.id;
});

beforeEach(async () => {
  await handle.db.delete(appointments);
  await handle.db.delete(customers);
});

afterAll(async () => {
  setDb(undefined);
  await handle.close();
});

describe("booking requests", () => {
  it("creates a PENDING appointment that blocks the slot", async () => {
    const { appointment } = await createBookingRequest(booking(), { now: NOW });
    expect(appointment.status).toBe("PENDING");
    expect(appointment.startTime).toBe("14:00:00");
    expect(appointment.endTime).toBe("14:30:00");

    const day = await getDayAvailability(THURSDAY, { durationMinutes: 30, barberId: rayanId, now: NOW });
    const times = day.slots.map((s) => s.time);
    expect(times).not.toContain("13:45");
    expect(times).not.toContain("14:00");
    expect(times).not.toContain("14:15");
    expect(times).toContain("14:30");
  });

  it("rejects a second request for an occupied slot", async () => {
    await createBookingRequest(booking(), { now: NOW });
    await expect(createBookingRequest(booking({ startTime: "14:15" }), { now: NOW })).rejects.toMatchObject({
      code: "SLOT_TAKEN",
    });
  });

  it("assigns another barber when the customer has no preference", async () => {
    await createBookingRequest(booking(), { now: NOW });
    const { appointment } = await createBookingRequest(booking({ barberId: null }), { now: NOW });
    expect(appointment.barberId).toBe(milanId);
    expect(appointment.anyBarber).toBe(true);
  });

  it("allows exactly one of many simultaneous requests for the same slot", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => createBookingRequest(booking({ startTime: "16:00" }), { now: NOW })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const active = await handle.db
      .select()
      .from(appointments)
      .where(and(eq(appointments.date, THURSDAY), eq(appointments.startTime, "16:00")));
    expect(active).toHaveLength(1);
  });

  it("refuses times that are closed, in the past or within the lead time", async () => {
    await expect(
      createBookingRequest(booking({ date: "2026-10-11" }), { now: NOW }), // Sunday
    ).rejects.toMatchObject({ code: "SLOT_TAKEN" });
    await expect(
      createBookingRequest(booking({ date: "2026-10-05", startTime: "10:30" }), { now: NOW }),
    ).rejects.toMatchObject({ code: "SLOT_TAKEN" });
    await expect(
      createBookingRequest(booking({ date: "2026-10-01" }), { now: NOW }),
    ).rejects.toMatchObject({ code: "INVALID" });
  });

  it("frees the slot again after a rejection", async () => {
    const { appointment } = await createBookingRequest(booking(), { now: NOW });
    await changeStatus(appointment.id, "REJECTED", { userId: null });
    const { appointment: second } = await createBookingRequest(booking(), { now: NOW });
    expect(second.status).toBe("PENDING");
  });

  it("blocks overlapping appointments at database level", async () => {
    const { appointment } = await createBookingRequest(booking(), { now: NOW });
    await expect(
      handle.db.insert(appointments).values({ ...appointment, id: undefined, startTime: "14:15", endTime: "14:45" }),
    ).rejects.toThrow();
  });

  it("limits the number of open appointments per customer", async () => {
    const email = "vaste.klant@example.com";
    for (const startTime of ["10:00", "11:00", "12:00"]) {
      await createBookingRequest(booking({ email, startTime }), { now: NOW });
    }
    await expect(
      createBookingRequest(booking({ email, startTime: "13:00" }), { now: NOW }),
    ).rejects.toMatchObject({ code: "LIMIT" });
  });
});

describe("customer self-service via secure link", () => {
  it("rejects tampered tokens", async () => {
    const { token } = await createBookingRequest(booking(), { now: NOW });
    expect(await getAppointmentByToken(token)).not.toBeNull();
    expect(await getAppointmentByToken(`${token.slice(0, -1)}x`)).toBeNull();
  });

  it("cancels and frees the slot", async () => {
    const { token } = await createBookingRequest(booking(), { now: NOW });
    const { appointment } = await cancelByCustomer(token, { now: NOW });
    expect(appointment.status).toBe("CANCELLED");
    expect(appointment.cancelledBy).toBe("CUSTOMER");
    await expect(createBookingRequest(booking(), { now: NOW })).resolves.toBeTruthy();
  });

  it("reschedules to a free time and asks for confirmation again", async () => {
    const { appointment, token } = await createBookingRequest(booking(), { now: NOW });
    await changeStatus(appointment.id, "APPROVED", { userId: null });
    const moved = await rescheduleByCustomer(token, { date: THURSDAY, startTime: "14:15" }, { now: NOW });
    expect(moved.appointment.startTime).toBe("14:15:00");
    expect(moved.appointment.status).toBe("PENDING");
  });

  it("does not allow changes to a confirmed appointment within the cutoff", async () => {
    const { appointment, token } = await createBookingRequest(booking(), { now: NOW });
    await changeStatus(appointment.id, "APPROVED", { userId: null });
    const late: ZonedNow = { date: THURSDAY, minutes: 12 * 60 };
    await expect(cancelByCustomer(token, { now: late })).rejects.toMatchObject({ code: "NOT_ALLOWED" });
  });
});

describe("scheduled jobs", () => {
  it("sends one reminder the day before (from 17:00) and completes past appointments", async () => {
    const soon = await createBookingRequest(booking({ date: "2026-10-06", startTime: "10:00" }), { now: NOW });
    const later = await createBookingRequest(booking({ date: THURSDAY, startTime: "15:00" }), { now: NOW });
    const pending = await createBookingRequest(booking({ date: "2026-10-06", startTime: "11:00" }), { now: NOW });
    await changeStatus(soon.appointment.id, "APPROVED", { userId: null });
    await changeStatus(later.appointment.id, "APPROVED", { userId: null });

    const sent: string[] = [];
    const send = async (id: string) => (sent.push(id), true);
    // Monday 12:00: too early in the day, nothing is sent yet.
    const early = await runScheduledJobs({ now: { date: NOW.date, minutes: 12 * 60 }, send });
    expect(early.reminders).toBe(0);
    // Monday 17:30: only tomorrow's confirmed appointment (not Thursday, not the unconfirmed request).
    const first = await runScheduledJobs({ now: { date: NOW.date, minutes: 17 * 60 + 30 }, send });
    expect(first.reminders).toBe(1);
    expect(sent).toEqual([soon.appointment.id]);
    expect(sent).not.toContain(pending.appointment.id);
    const again = await runScheduledJobs({ now: { date: NOW.date, minutes: 18 * 60 + 30 }, send });
    expect(again.reminders).toBe(0);

    // Tuesday 13:00: the 10:00–10:30 appointment ended more than two hours ago.
    const next = await runScheduledJobs({ now: { date: "2026-10-06", minutes: 13 * 60 }, send });
    expect(next.completed).toBe(1);
    const [done] = await handle.db.select().from(appointments).where(eq(appointments.id, soon.appointment.id));
    expect(done.status).toBe("COMPLETED");
  });
});

describe("suggestions", () => {
  it("returns the next days with recommended times", async () => {
    const suggestions = await getSuggestions({ durationMinutes: 30, barberId: null, now: NOW });
    expect(suggestions).toHaveLength(3);
    expect(suggestions[0].date).toBe(NOW.date);
    expect(suggestions[0].times.length).toBeGreaterThan(0);
    expect(suggestions[0].times.every((t) => t >= "11:00")).toBe(true); // lead time of 60 minutes
  });

  it("looks past a long closed period (e.g. opening on 1 November)", async () => {
    await handle.db.insert(blockedTimes).values({ startDate: NOW.date, endDate: "2026-10-31", reason: "Opening" });
    try {
      const suggestions = await getSuggestions({ durationMinutes: 30, barberId: null, now: NOW });
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].date).toBe("2026-11-02"); // 1 November is a Sunday (closed)
    } finally {
      await handle.db.delete(blockedTimes);
    }
  });
});
