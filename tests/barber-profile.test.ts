import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localizedIntro, localizedRole } from "@/i18n/content";
import { home } from "@/i18n/messages/home";
import { currentYear, experienceSince, experienceYears, featuredBarber, paragraphs } from "@/lib/barber-profile";
import { openDatabase, setDb, type DatabaseHandle } from "@/server/db/client";
import { barbers } from "@/server/db/schema";
import { seedBaseData } from "@/server/db/seed";
import { saveBarber } from "@/server/services/admin-config";
import { listBarbers } from "@/server/services/catalog";

describe("experience", () => {
  it("is stored as a starting year and counts on by itself", () => {
    expect(experienceSince(20, 2026)).toBe(2006);
    expect(experienceYears(2006, 2026)).toBe(20);
    expect(experienceYears(2006, 2027)).toBe(21);
    expect(experienceSince(null, 2026)).toBeNull();
    expect(experienceYears(null, 2026)).toBeNull();
  });

  it("is not shown below one year", () => {
    expect(experienceYears(2026, 2026)).toBeNull();
    expect(experienceYears(2030, 2026)).toBeNull();
  });

  it("uses the year in the Netherlands, also on New Year's Eve", () => {
    // 23:30 UTC on 31 December is already 00:30 on 1 January in Amsterdam.
    expect(currentYear(new Date("2026-12-31T23:30:00Z"))).toBe(2027);
    expect(currentYear(new Date("2026-12-31T22:30:00Z"))).toBe(2026);
  });

  it("reads naturally in every language", () => {
    expect(home.nl.barber.facts.experience(20)).toEqual({ value: "20 jaar", label: "ervaring als barber" });
    expect(home.en.barber.facts.experience(1).value).toBe("1 year");
    expect(home.en.barber.facts.experience(20).value).toBe("20 years");
    expect(home.de.barber.facts.experience(1).value).toBe("1 Jahr");
    expect(home.de.barber.experienceShort(12)).toBe("12 Jahre Erfahrung");
    expect(home.nl.whyUs.craft.text(20)).toMatch(/^20 jaar ervaring/);
    expect(home.nl.whyUs.craft.text(null)).not.toMatch(/\d/);
  });
});

describe("homepage block", () => {
  it("introduces the owner, or the first barber when nobody is ticked as owner", () => {
    const a = { name: "A", isOwner: false };
    const b = { name: "B", isOwner: true };
    expect(featuredBarber([a, b])).toBe(b);
    expect(featuredBarber([a, { ...b, isOwner: false }])).toBe(a);
    expect(featuredBarber([])).toBeUndefined();
  });

  it("turns each line of the introduction into a paragraph", () => {
    expect(paragraphs("Eerste alinea.\n\n  Tweede alinea.  \r\nDerde.")).toEqual(["Eerste alinea.", "Tweede alinea.", "Derde."]);
    expect(paragraphs(null)).toEqual([]);
    expect(paragraphs("   ")).toEqual([]);
  });

  it("shows the role and introduction in the visitor's language, falling back to Dutch", () => {
    const barber = {
      role: "Eigenaar & barber",
      roleEn: "Owner & barber",
      roleDe: null,
      intro: "Welkom.",
      introEn: null,
      introDe: "Willkommen.",
    };
    expect(localizedRole(barber, "en")).toBe("Owner & barber");
    expect(localizedRole(barber, "de")).toBe("Eigenaar & barber");
    expect(localizedIntro(barber, "en")).toBe("Welkom.");
    expect(localizedIntro(barber, "de")).toBe("Willkommen.");
    expect(localizedRole({ role: null, roleEn: null, roleDe: null }, "nl")).toBeNull();
  });
});

describe("barber profile in the database", () => {
  let handle: DatabaseHandle;

  beforeAll(async () => {
    handle = openDatabase({ kind: "pglite", dataDir: undefined });
    await handle.migrate();
    await seedBaseData(handle.db);
    setDb(handle.db);
  });

  afterAll(async () => {
    await handle.close();
  });

  it("saves and loads experience, role, certification, owner and introduction", async () => {
    const hours = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, isWorking: weekday <= 5, startTime: "09:00", endTime: "17:00" }));
    const id = await saveBarber(null, {
      name: "Sem",
      bio: "Fades en baarden.",
      bioEn: null,
      bioDe: null,
      role: "Barber",
      roleEn: null,
      roleDe: "Friseur",
      intro: "Regel één.\nRegel twee.",
      introEn: null,
      introDe: null,
      experienceSince: 2019,
      isCertified: true,
      isOwner: false,
      isActive: true,
      sortOrder: 5,
      hours,
    });
    const sem = (await listBarbers()).find((b) => b.id === id)!;
    expect(sem).toMatchObject({
      role: "Barber",
      roleDe: "Friseur",
      intro: "Regel één.\nRegel twee.",
      experienceSince: 2019,
      isCertified: true,
      isOwner: false,
    });

    await saveBarber(id, { ...sem, experienceSince: null, isCertified: false, isOwner: true, hours });
    const updated = (await listBarbers()).find((b) => b.id === id)!;
    expect(updated).toMatchObject({ experienceSince: null, isCertified: false, isOwner: true });
  });

  it("moves the facts that used to be fixed text on the homepage to Rohid's record", async () => {
    const [rohid] = await handle.db.insert(barbers).values({ name: "Rohid", sortOrder: 0 }).returning();
    // The data step at the end of the migration, run again now that a barber called Rohid exists.
    const migration = readFileSync(join(process.cwd(), "drizzle/0015_barber_profile.sql"), "utf8");
    const update = migration.slice(migration.indexOf("UPDATE"));
    await handle.db.execute(sql.raw(update));

    const [row] = await handle.db.select().from(barbers).where(eq(barbers.id, rohid.id));
    expect(row).toMatchObject({
      isOwner: true,
      isCertified: true,
      experienceSince: 2006,
      role: "Eigenaar & barber",
      roleEn: "Owner & barber",
      roleDe: "Inhaber & Barber",
    });
    expect(experienceYears(row.experienceSince, 2026)).toBe(20);
    expect(row.intro).toMatch(/^Rohid is de eigenaar van RKM Barbershop en gecertificeerd barber\./);
    expect(row.introEn).toMatch(/^Rohid is the owner/);
    expect(row.introDe).toMatch(/^Rohid ist der Inhaber/);

    // Other barbers are left alone.
    const others = await handle.db.select().from(barbers).where(eq(barbers.name, "Milan"));
    expect(others[0]).toMatchObject({ isOwner: false, isCertified: false, experienceSince: null, intro: null });
  });
});
