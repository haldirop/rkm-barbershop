import { count, eq } from "drizzle-orm";
import { daySlots, type DayInput } from "@/lib/availability";
import { addDays, isoWeekday, minutesToTime, timeToMinutes, zonedNow } from "@/lib/time";
import type { Database } from "./client";
import {
  appointments,
  barberWorkingHours,
  barbers,
  businessHours,
  customers,
  reviews,
  services,
  settings,
} from "./schema";

/**
 * Starting configuration for a fresh installation. Everything here can be changed
 * in /admin. Contact details are placeholders — the dashboard reminds the owner
 * to confirm them before going live.
 */
export async function seedBaseData(db: Database): Promise<boolean> {
  const [{ existing }] = await db.select({ existing: count() }).from(settings);
  if (existing > 0) return false;

  await db.transaction(async (tx) => {
    await tx.insert(settings).values({
      id: 1,
      businessName: "RKM Barbershop",
      tagline: "Strak geknipt. Zelfverzekerd naar buiten.",
      phone: "020 000 0000",
      email: "info@rkmbarbershop.nl",
      street: "Voorbeeldstraat 12",
      postalCode: "1234 AB",
      city: "Amsterdam",
    });

    const hours: Array<[number, string, string, boolean]> = [
      [1, "09:00", "18:00", true],
      [2, "09:00", "18:00", true],
      [3, "09:00", "18:00", true],
      [4, "09:00", "20:00", true],
      [5, "09:00", "20:00", true],
      [6, "09:00", "17:00", true],
      [7, "10:00", "17:00", false],
    ];
    await tx.insert(businessHours).values(
      hours.map(([weekday, openTime, closeTime, isOpen]) => ({ weekday, openTime, closeTime, isOpen })),
    );

    await tx.insert(services).values([
      {
        name: "Knippen",
        description: "Klassiek of modern, afgestemd op je haartype. Inclusief wassen en styling.",
        priceCents: 2500,
        durationMinutes: 30,
        sortOrder: 1,
      },
      {
        name: "Skin Fade",
        description: "Strakke fade tot op de huid met een naadloze overgang. Afgewerkt met scheermes.",
        priceCents: 3000,
        durationMinutes: 45,
        sortOrder: 2,
      },
      {
        name: "Knippen + Baard",
        description: "Complete behandeling: knipbeurt en baard in model, met strakke contouren.",
        priceCents: 3750,
        durationMinutes: 45,
        sortOrder: 3,
      },
      {
        name: "Baard",
        description: "Baard trimmen en in model brengen, contouren met het mes en verzorgende olie.",
        priceCents: 1750,
        durationMinutes: 20,
        sortOrder: 4,
      },
      {
        name: "Kinderen t/m 12 jaar",
        description: "Rustig en met aandacht geknipt, voor de jongste gasten.",
        priceCents: 2000,
        durationMinutes: 30,
        sortOrder: 5,
      },
      {
        name: "Hot Towel Shave",
        description: "Traditioneel scheren met warme handdoeken, scheerzeep en mes.",
        priceCents: 2750,
        durationMinutes: 30,
        sortOrder: 6,
      },
    ]);

    const [first, second] = await tx
      .insert(barbers)
      .values([
        { name: "Rayan", bio: "Eigenaar. Specialist in fades en strakke contouren.", sortOrder: 1 },
        { name: "Milan", bio: "Klassieke knipbeurten en baardverzorging.", sortOrder: 2 },
      ])
      .returning();

    const week = [1, 2, 3, 4, 5, 6, 7];
    await tx.insert(barberWorkingHours).values([
      ...week.map((weekday) => ({
        barberId: first.id,
        weekday,
        isWorking: weekday <= 6,
        startTime: "09:00",
        endTime: "20:00",
      })),
      ...week.map((weekday) => ({
        barberId: second.id,
        weekday,
        isWorking: weekday >= 3 && weekday <= 6,
        startTime: "10:00",
        endTime: "20:00",
      })),
    ]);
  });
  return true;
}

// ---------------------------------------------------------------------------
// Demo data — always flagged with is_demo and removable in one click.
// ---------------------------------------------------------------------------

const DEMO_CUSTOMERS = [
  ["Jan", "Jansen"],
  ["Mohamed", "El Amrani"],
  ["Thomas", "de Vries"],
  ["Sem", "Bakker"],
  ["Youssef", "Benali"],
  ["Daan", "Visser"],
  ["Luca", "Smit"],
  ["Noah", "Mulder"],
  ["Ilias", "Haddou"],
  ["Finn", "de Boer"],
] as const;

/** Small deterministic PRNG so demo data looks the same on every machine. */
function prng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export async function seedDemoData(db: Database) {
  await removeDemoData(db);
  const random = prng(42);
  const today = zonedNow().date;

  const demoCustomers = await db
    .insert(customers)
    .values(
      DEMO_CUSTOMERS.map(([firstName, lastName], i) => ({
        firstName,
        lastName,
        email: `demo.${firstName.toLowerCase()}.${i}@example.com`,
        phone: `0600000${String(100 + i)}`,
        isDemo: true,
      })),
    )
    .returning();

  const serviceRows = await db.select().from(services).where(eq(services.isActive, true));
  const barberRows = await db.select().from(barbers).where(eq(barbers.isActive, true));
  const hourRows = await db.select().from(businessHours);
  const barberHours = await db.select().from(barberWorkingHours);
  const booked: Array<{ id: string; barberId: string; date: string; start: number; end: number }> = [];

  let created = 0;
  for (let offset = -14; offset <= 12; offset++) {
    const date = addDays(today, offset);
    const weekday = isoWeekday(date);
    const shop = hourRows.find((h) => h.weekday === weekday);
    if (!shop?.isOpen) continue;

    // Busier closer to today and on Thursday–Saturday, so the calendar shows variety.
    const fill = Math.max(0.15, (weekday >= 4 ? 0.65 : 0.45) - Math.max(0, offset) * 0.03);
    for (const barber of barberRows) {
      const bh = barberHours.find((h) => h.barberId === barber.id && h.weekday === weekday);
      if (!bh?.isWorking) continue;
      for (let attempt = 0; attempt < 14; attempt++) {
        if (random() > fill) continue;
        const service = serviceRows[Math.floor(random() * serviceRows.length)];
        const day: DayInput = {
          shopHours: { start: timeToMinutes(shop.openTime), end: timeToMinutes(shop.closeTime) },
          barbers: [{ id: barber.id, hours: { start: timeToMinutes(bh.startTime), end: timeToMinutes(bh.endTime) } }],
          breaks: [],
          blocks: [],
          appointments: booked.filter((b) => b.date === date),
        };
        const slots = daySlots(day, {
          durationMinutes: service.durationMinutes,
          slotIntervalMinutes: 15,
          bufferMinutes: 0,
          earliestStart: offset === 0 ? zonedNow().minutes + 60 : 0,
        });
        if (!slots.length) break;
        const slot = slots[Math.floor(random() * slots.length)];
        const customer = demoCustomers[Math.floor(random() * demoCustomers.length)];
        const status =
          offset < 0
            ? random() < 0.85
              ? "COMPLETED"
              : "CANCELLED"
            : random() < (offset <= 2 ? 0.75 : 0.55)
              ? "APPROVED"
              : "PENDING";
        const [row] = await db
          .insert(appointments)
          .values({
            customerId: customer.id,
            barberId: barber.id,
            barberName: barber.name,
            serviceId: service.id,
            serviceName: service.name,
            priceCents: service.priceCents,
            durationMinutes: service.durationMinutes,
            date,
            startTime: minutesToTime(slot.start),
            endTime: minutesToTime(slot.end),
            status,
            notes: random() < 0.2 ? "Graag niet te kort aan de zijkanten." : null,
            source: "ONLINE",
            statusChangedAt: new Date(),
            isDemo: true,
          })
          .returning();
        if (status !== "CANCELLED") {
          booked.push({ id: row.id, barberId: barber.id, date, start: slot.start, end: slot.end });
        }
        created++;
      }
    }
  }

  await db.insert(reviews).values([
    {
      authorName: "Voorbeeldreview",
      rating: 5,
      body: "Dit is een voorbeeldreview. Voeg echte reviews van klanten toe via Beheer → Reviews.",
      source: "Demo",
      isDemo: true,
      sortOrder: 1,
    },
    {
      authorName: "Voorbeeldreview",
      rating: 5,
      body: "Voorbeeldtekst: strakke fade, prettige sfeer en precies op tijd geholpen.",
      source: "Demo",
      isDemo: true,
      sortOrder: 2,
    },
    {
      authorName: "Voorbeeldreview",
      rating: 4,
      body: "Voorbeeldtekst: afspraak makkelijk online geregeld en snel bevestigd.",
      source: "Demo",
      isDemo: true,
      sortOrder: 3,
    },
  ]);

  return { customers: demoCustomers.length, appointments: created };
}

export async function removeDemoData(db: Database) {
  await db.transaction(async (tx) => {
    await tx.delete(appointments).where(eq(appointments.isDemo, true));
    await tx.delete(customers).where(eq(customers.isDemo, true));
    await tx.delete(reviews).where(eq(reviews.isDemo, true));
  });
}

export async function hasDemoData(db: Database): Promise<boolean> {
  const [{ total }] = await db.select({ total: count() }).from(customers).where(eq(customers.isDemo, true));
  const [{ reviewTotal }] = await db
    .select({ reviewTotal: count() })
    .from(reviews)
    .where(eq(reviews.isDemo, true));
  return total + reviewTotal > 0;
}
