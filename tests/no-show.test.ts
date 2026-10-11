import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { openDatabase, setDb, type DatabaseHandle } from "@/server/db/client";
import { appointments, barbers, customers, sales, services } from "@/server/db/schema";
import { seedBaseData } from "@/server/db/seed";
import { changeStatus, countByStatus, getAppointmentDetail, listPendingRequests } from "@/server/services/appointments";
import { createBookingRequest } from "@/server/services/booking";
import { getCustomerDetail } from "@/server/services/customers";
import { checkout } from "@/server/services/pos";

let handle: DatabaseHandle;
let knippenId: string;
let rayanId: string;

beforeAll(async () => {
  handle = openDatabase({ kind: "pglite", dataDir: undefined });
  await handle.migrate();
  await seedBaseData(handle.db);
  setDb(handle.db);
  knippenId = (await handle.db.select().from(services).where(eq(services.name, "Knippen")))[0].id;
  rayanId = (await handle.db.select().from(barbers).where(eq(barbers.name, "Rayan")))[0].id;
});

beforeEach(async () => {
  vi.useRealTimers();
  await handle.db.delete(sales).where(eq(sales.kind, "REFUND"));
  await handle.db.delete(sales);
  await handle.db.delete(appointments);
  await handle.db.delete(customers);
});

afterAll(async () => {
  vi.useRealTimers();
  setDb(undefined);
  await handle.close();
});

/** An approved appointment on Thursday 8 October 2026, 14:00–14:30, booked on Monday. */
async function approved(email = "jan@example.com") {
  const { appointment } = await createBookingRequest(
    {
      serviceId: knippenId,
      barberId: rayanId,
      date: "2026-10-08",
      startTime: "14:00",
      firstName: "Jan",
      lastName: "Jansen",
      phone: "0612345678",
      email,
      notes: null,
    },
    { now: { date: "2026-10-05", minutes: 600 } },
  );
  await changeStatus(appointment.id, "APPROVED", { userId: null });
  return appointment;
}

/** Shop time: 8 October 2026 at hh:mm (CEST = UTC+2). */
const at = (hhmm: string) => vi.setSystemTime(new Date(`2026-10-08T${hhmm}:00+02:00`));

describe("niet verschenen", () => {
  it("can only be marked once the appointment has started", async () => {
    const a = await approved();
    vi.useFakeTimers({ toFake: ["Date"] });
    at("13:30");
    await expect(changeStatus(a.id, "NO_SHOW", { userId: null })).rejects.toThrow(/begonnen/);
    at("14:05");
    const { appointment } = await changeStatus(a.id, "NO_SHOW", { userId: null });
    expect(appointment.status).toBe("NO_SHOW");
    expect((await countByStatus()).NO_SHOW).toBe(1);
  });

  it("is counted per customer and shown on new requests", async () => {
    const a = await approved();
    vi.useFakeTimers({ toFake: ["Date"] });
    at("15:00");
    await changeStatus(a.id, "NO_SHOW", { userId: null });
    vi.useRealTimers();

    expect((await getAppointmentDetail(a.id))?.customerNoShows).toBe(1);
    expect((await getCustomerDetail(a.customerId))?.noShows).toBe(1);

    // The same customer asks for a new appointment: the request carries the warning.
    const { appointment: next } = await createBookingRequest(
      {
        serviceId: knippenId,
        barberId: rayanId,
        date: "2026-12-03",
        startTime: "11:00",
        firstName: "Jan",
        lastName: "Jansen",
        phone: "0612345678",
        email: "jan@example.com",
        notes: null,
      },
      { now: { date: "2026-11-01", minutes: 600 } },
    );
    const pending = await listPendingRequests();
    expect(pending.find((p) => p.id === next.id)?.noShows).toBe(1);
  });

  it("can be undone, also after the nightly job completed it, but not once it is paid", async () => {
    const a = await approved();
    vi.useFakeTimers({ toFake: ["Date"] });
    at("15:00");
    await changeStatus(a.id, "COMPLETED", { userId: null, actor: "SYSTEM" });
    await changeStatus(a.id, "NO_SHOW", { userId: null });
    const { appointment } = await changeStatus(a.id, "COMPLETED", { userId: null });
    expect(appointment.status).toBe("COMPLETED");

    // Paid at the till: the customer was there.
    await checkout(
      {
        appointmentId: a.id,
        customerId: null,
        barberId: null,
        items: [{ kind: "SERVICE", id: knippenId, quantity: 1, unitPriceCents: 2500 }],
        discount: null,
        tipCents: 0,
        paymentMethod: "CARD",
        note: null,
        userId: null,
      },
      { now: { date: "2026-10-08", minutes: 15 * 60 } },
    );
    await expect(changeStatus(a.id, "NO_SHOW", { userId: null })).rejects.toThrow(/afgerekend/);
  });
});
