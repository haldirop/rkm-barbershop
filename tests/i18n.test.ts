import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { availabilityAlertEmail, templates, type TemplateContext } from "@/emails/templates";
import {
  localizePath,
  localizedUrl,
  preferredLocale,
  resolvePublicPath,
  switchLocalePath,
  toInternalPath,
} from "@/i18n/config";
import { localizeService, localizedTagline } from "@/i18n/content";
import { customerErrorText, translateCustomerMessage } from "@/i18n/errors";
import { booking, localizeFieldErrors } from "@/i18n/messages/booking";
import { common } from "@/i18n/messages/common";
import { email } from "@/i18n/messages/email";
import { home } from "@/i18n/messages/home";
import { privacy } from "@/i18n/messages/privacy";
import { formatDateLong, formatDuration, formatPrice, relativeDayPhrase } from "@/lib/format";
import { openStatus, type OpeningDay } from "@/lib/opening-hours";
import type { ZonedNow } from "@/lib/time";
import { customerDetailsSchema, fieldErrors } from "@/lib/validation";
import { openDatabase, setDb, type DatabaseHandle } from "@/server/db/client";
import { DEFAULT_SERVICE_TRANSLATIONS } from "@/server/db/default-translations";
import { appointments, availabilityAlerts, barbers, customers, services, settings } from "@/server/db/schema";
import { seedBaseData } from "@/server/db/seed";
import type { Appointment, Customer, Settings } from "@/server/db/schema";
import { createBookingRequest, customerChangePolicy } from "@/server/services/booking";
import { DomainError } from "@/server/services/shared";
import { createAvailabilityAlert } from "@/server/services/waitlist";

describe("addresses per language", () => {
  it("serves Dutch without a prefix and English and German under their own page names", () => {
    expect(resolvePublicPath("/")).toEqual({ kind: "page", locale: "nl", internal: "/nl" });
    expect(resolvePublicPath("/behandelingen")).toEqual({ kind: "page", locale: "nl", internal: "/nl/behandelingen" });
    expect(resolvePublicPath("/en")).toEqual({ kind: "page", locale: "en", internal: "/en" });
    expect(resolvePublicPath("/en/treatments")).toEqual({ kind: "page", locale: "en", internal: "/en/behandelingen" });
    expect(resolvePublicPath("/de/termin-buchen")).toEqual({ kind: "page", locale: "de", internal: "/de/afspraak-maken" });
    expect(resolvePublicPath("/de/termin/abc.def")).toEqual({ kind: "page", locale: "de", internal: "/de/afspraak/abc.def" });
    expect(resolvePublicPath("/de/datenschutz")).toEqual({ kind: "page", locale: "de", internal: "/de/privacy" });
    // Unknown pages stay in their language, so the 404 page is too.
    expect(resolvePublicPath("/en/nope")).toEqual({ kind: "page", locale: "en", internal: "/en/nope" });
  });

  it("sends visitors from a non-canonical address to the right one", () => {
    expect(resolvePublicPath("/nl")).toEqual({ kind: "redirect", locale: "nl", to: "/" });
    expect(resolvePublicPath("/nl/behandelingen")).toEqual({ kind: "redirect", locale: "nl", to: "/behandelingen" });
    expect(resolvePublicPath("/en/behandelingen")).toEqual({ kind: "redirect", locale: "en", to: "/en/treatments" });
    expect(resolvePublicPath("/de/book")).toEqual({ kind: "redirect", locale: "de", to: "/de/termin-buchen" });
  });

  it("builds links with query and anchor", () => {
    expect(localizePath("/afspraak-maken?behandeling=x&datum=2026-11-03", "en")).toBe("/en/book?behandeling=x&datum=2026-11-03");
    expect(localizePath("/#prijzen", "de")).toBe("/de#prijzen");
    expect(localizePath("/", "en")).toBe("/en");
    expect(localizePath("/", "nl")).toBe("/");
    expect(localizePath("/afspraak/tok.en", "nl")).toBe("/afspraak/tok.en");
    expect(localizedUrl("https://rkm.test/", "/afspraak/t", "de")).toBe("https://rkm.test/de/termin/t");
  });

  it("switches the current page to another language, also from the internal address", () => {
    expect(switchLocalePath("/behandelingen", "en")).toBe("/en/treatments");
    expect(switchLocalePath("/en/book?behandeling=x&stap=moment", "de")).toBe("/de/termin-buchen?behandeling=x&stap=moment");
    expect(switchLocalePath("/de/termin/abc.def", "nl")).toBe("/afspraak/abc.def");
    expect(switchLocalePath("/en/afspraak-maken", "nl")).toBe("/afspraak-maken");
    expect(switchLocalePath("/en", "nl")).toBe("/");
    expect(toInternalPath("/en/afspraak-maken")).toBe("/en/afspraak-maken");
    expect(toInternalPath("/admin/agenda")).toBe("/nl/admin/agenda");
  });

  it("only suggests a language the browser prefers and we offer", () => {
    expect(preferredLocale(["de-DE", "en-US"])).toBe("de");
    expect(preferredLocale(["fr-FR", "en-GB"])).toBe("en");
    expect(preferredLocale(["fr-FR", "es"])).toBeNull();
  });
});

describe("translations", () => {
  /** Same keys everywhere, no empty texts and the same number of parameters in functions. */
  function compare(nl: unknown, other: unknown, path: string) {
    if (typeof nl === "function") {
      expect(typeof other, path).toBe("function");
      expect((other as (...args: unknown[]) => unknown).length, path).toBe(nl.length);
      return;
    }
    if (Array.isArray(nl)) {
      expect(Array.isArray(other), path).toBe(true);
      expect((other as unknown[]).length, path).toBe(nl.length);
      nl.forEach((item, i) => compare(item, (other as unknown[])[i], `${path}[${i}]`));
      return;
    }
    if (nl && typeof nl === "object") {
      expect(Object.keys(other as object).sort(), path).toEqual(Object.keys(nl).sort());
      for (const key of Object.keys(nl)) compare((nl as Record<string, unknown>)[key], (other as Record<string, unknown>)[key], `${path}.${key}`);
      return;
    }
    // Empty in Dutch may be empty elsewhere too (e.g. the word after a name).
    if (typeof nl === "string" && nl) expect((other as string).trim().length, path).toBeGreaterThan(0);
  }

  it("are complete in English and German", () => {
    for (const [name, messages] of Object.entries({ common, home, booking, privacy, email })) {
      for (const locale of ["en", "de"] as const) {
        compare(messages.nl, messages[locale], `${name}.${locale}`);
      }
    }
  });

  it("formats dates, prices and durations per language", () => {
    expect(formatDateLong("2026-11-03", false, "nl")).toBe("dinsdag 3 november");
    expect(formatDateLong("2026-11-03", false, "en")).toBe("Tuesday 3 November");
    expect(formatDateLong("2026-11-03", false, "de")).toBe("Dienstag, 3. November");
    expect(formatPrice(2250, "en").replace(/ /g, " ")).toBe("€22.50");
    expect(formatPrice(2500, "de").replace(/ /g, " ")).toBe("25 €");
    expect(formatDuration(45, "de")).toBe("45 Min.");
    expect(formatDuration(60, "en")).toBe("1 hour");
    expect(relativeDayPhrase("2026-11-06", "2026-11-03", "en")).toEqual({ day: "on Friday 6 November", withDate: false });
    expect(relativeDayPhrase("2026-11-04", "2026-11-03", "de")).toEqual({ day: "morgen", withDate: true });
    expect(relativeDayPhrase("2026-11-06", "2026-11-03", "de")).toEqual({ day: "am Freitag, 6. November", withDate: false });
    expect(relativeDayPhrase("2026-11-06", "2026-11-03", "nl")).toEqual({ day: "vrijdag 6 november", withDate: false });
    expect(relativeDayPhrase("2026-11-03", "2026-11-03", "en")).toEqual({ day: "today", withDate: false });
  });

  it("shows whether the shop is open in the page language", () => {
    const days: OpeningDay[] = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
      weekday,
      isOpen: weekday !== 7,
      open: "09:00",
      close: "18:00",
    }));
    const tuesdayNoon: ZonedNow = { date: "2026-11-03", minutes: 12 * 60 };
    const saturdayEvening: ZonedNow = { date: "2026-11-07", minutes: 19 * 60 };
    expect(openStatus(days, tuesdayNoon, [], 120, "en").label).toBe("Open now · until 18:00");
    expect(openStatus(days, tuesdayNoon, [], 120, "de").label).toBe("Jetzt geöffnet · bis 18:00");
    expect(openStatus(days, saturdayEvening, [], 120, "en").label).toBe("Closed · open again on Monday at 09:00");
    expect(openStatus(days, saturdayEvening, [], 120, "de").label).toBe("Geschlossen · am Montag wieder ab 09:00 geöffnet");
  });

  it("translates form checks and customer messages", () => {
    const result = customerDetailsSchema.safeParse({ firstName: "", lastName: "J", phone: "12", email: "x", notes: "" });
    expect(result.success).toBe(false);
    const errors = localizeFieldErrors(fieldErrors(result.error!), "de");
    expect(errors.firstName).toBe("Bitte fülle dieses Feld aus.");
    expect(errors.phone).toBe("Bitte gib eine gültige Telefonnummer ein, zum Beispiel +49 151 12345678.");
    expect(errors.email).toBe("Bitte gib eine gültige E-Mail-Adresse ein.");

    expect(translateCustomerMessage({ key: "cutoff", arg: 24 }, "en")).toBe(
      "You can change or cancel online up to 24 hours in advance. Give us a call and we’ll find a solution together.",
    );
    // A taken slot is always translated, also when the error itself has no key.
    expect(customerErrorText(new DomainError("Dit tijdslot overlapt.", "SLOT_TAKEN"), "de")).toBe(
      "Diese Uhrzeit wurde gerade vergeben. Bitte wähle einen anderen Zeitpunkt.",
    );
    // Errors without a translation keep their Dutch text.
    expect(customerErrorText(new DomainError("Iets anders."), "en")).toBe("Iets anders.");
  });

  it("uses the English or German texts typed in the admin, or the Dutch ones when empty", () => {
    const service = { name: "Knippen", description: "Klassiek", nameEn: "Haircut", nameDe: null, descriptionEn: "", descriptionDe: null };
    expect(localizeService(service, "en")).toMatchObject({ name: "Haircut", description: "Klassiek" });
    expect(localizeService(service, "de")).toMatchObject({ name: "Knippen", description: "Klassiek" });
    expect(localizedTagline({ tagline: "Strak", taglineEn: "Sharp", taglineDe: " " }, "de")).toBe("Strak");
    expect(localizedTagline({ tagline: "Strak", taglineEn: "Sharp", taglineDe: null }, "en")).toBe("Sharp");
  });
});

describe("e-mails in the customer's language", () => {
  const ctx = (locale: "nl" | "en" | "de"): TemplateContext => ({
    settings: {
      businessName: "RKM Barbershop",
      phone: "020 000 0000",
      email: "info@rkm.test",
      street: "Voorbeeldstraat 12",
      postalCode: "1234 AB",
      city: "Losser",
      cancellationCutoffHours: 24,
    } as Settings,
    appointment: {
      id: "a1",
      serviceName: "Knippen",
      barberName: "Rohid",
      priceCents: 2500,
      date: "2026-11-03",
      startTime: "15:30:00",
      endTime: "16:00:00",
      notes: null,
    } as Appointment,
    customer: { firstName: "Max", lastName: "Müller", phone: "+4915112345678", email: "max@example.de" } as Customer,
    links: { manage: "https://rkm.test/de/termin/x", ics: "https://rkm.test/ics", book: "https://rkm.test/de/termin-buchen" },
    locale,
    serviceName: locale === "de" ? "Haarschnitt" : locale === "en" ? "Haircut" : "Knippen",
  });

  it("writes to the customer in German or English", () => {
    const de = templates.approved(ctx("de"));
    de.text = de.text.replace(/\u00a0/g, " ");
    expect(de.subject).toBe("Dein Termin bei RKM Barbershop ist bestätigt");
    expect(de.html).toContain('<html lang="de">');
    expect(de.text).toContain("Hallo Max,");
    expect(de.text).toContain("Leistung: Haarschnitt");
    expect(de.text).toContain("Datum: Dienstag, 3. November");
    expect(de.text).toContain("Preis: 25 €");
    expect(de.text).toContain("spätestens 24 Stunden vorher");

    const en = templates.reminder(ctx("en"));
    expect(en.subject).toBe("Reminder: you have an appointment at RKM Barbershop tomorrow");
    expect(en.text).toContain("Treatment: Haircut");
    expect(en.text).toContain("Date: Tuesday 3 November");
  });

  it("keeps e-mails to the shop Dutch, with the customer's language", () => {
    const mail = templates.newRequestAdmin(ctx("de"));
    expect(mail.subject).toBe("Nieuwe afspraakaanvraag: Max Müller, dinsdag 3 november 15:30");
    expect(mail.html).toContain('<html lang="nl">');
    expect(mail.text).toContain("Taal: Duits");
    expect(mail.text).toContain("Behandeling: Knippen");
  });

  it("sends the waiting-list e-mail in the language of the sign-up", () => {
    const mail = availabilityAlertEmail({
      settings: ctx("en").settings,
      date: "2026-11-03",
      serviceName: "Haircut",
      barberName: null,
      times: ["10:00", "10:30"],
      bookUrl: "https://rkm.test/en/book",
      locale: "en",
    });
    expect(mail.subject).toBe("A spot has opened up on Tuesday 3 November");
    expect(mail.text).toContain("Free times: 10:00, 10:30");
  });
});

describe("language stored with the booking", () => {
  // Monday 2 November 2026, 10:00.
  const NOW: ZonedNow = { date: "2026-11-02", minutes: 600 };
  let handle: DatabaseHandle;
  let serviceId: string;
  let barberId: string;

  beforeAll(async () => {
    handle = openDatabase({ kind: "pglite", dataDir: undefined });
    await handle.migrate();
    await seedBaseData(handle.db);
    setDb(handle.db);
    serviceId = (await handle.db.select().from(services).where(eq(services.name, "Knippen")))[0].id;
    barberId = (await handle.db.select().from(barbers).where(eq(barbers.name, "Rayan")))[0].id;
  });

  beforeEach(async () => {
    await handle.db.delete(availabilityAlerts);
    await handle.db.delete(appointments);
    await handle.db.delete(customers);
  });

  afterAll(async () => {
    setDb(undefined);
    await handle.close();
  });

  it("remembers the language of the website the customer booked on", async () => {
    const input = {
      serviceId,
      barberId,
      date: "2026-11-05",
      startTime: "14:00",
      firstName: "Max",
      lastName: "Müller",
      phone: "+4915112345678",
      email: "max@example.de",
      notes: null,
    };
    const { appointment } = await createBookingRequest({ ...input, locale: "de" }, { now: NOW });
    expect(appointment.locale).toBe("de");
    // The appointment keeps the Dutch treatment name for the shop.
    expect(appointment.serviceName).toBe("Knippen");

    const dutch = await createBookingRequest({ ...input, startTime: "15:00", email: "jan@example.nl" }, { now: NOW });
    expect(dutch.appointment.locale).toBe("nl");

    // Booking the same slot again: the customer gets the message in their language.
    const taken = await createBookingRequest({ ...input, email: "other@example.de", locale: "de" }, { now: NOW }).catch((e) => e);
    expect(customerErrorText(taken, "de")).toBe("Diese Uhrzeit wurde gerade vergeben. Bitte wähle einen anderen Zeitpunkt.");
  });

  it("explains in the customer's language why an appointment can't be changed online", async () => {
    const policy = customerChangePolicy(
      { status: "APPROVED", date: "2026-11-02", startTime: "16:00:00" },
      { cancellationCutoffHours: 24 },
      NOW,
    );
    expect(policy.allowed).toBe(false);
    expect(policy.reason).toContain("tot 24 uur van tevoren");
    expect(translateCustomerMessage(policy.message!, "de")).toBe(
      "Ändern oder stornieren geht online bis 24 Stunden vorher. Ruf uns kurz an, dann finden wir gemeinsam eine Lösung.",
    );
  });

  it("stores the language of a waiting-list sign-up", async () => {
    // Fill Thursday with one long block so the day is fully booked for Rayan.
    const customer = (
      await handle.db.insert(customers).values({ firstName: "A", lastName: "B", phone: "0612345678" }).returning()
    )[0];
    await handle.db.insert(appointments).values({
      customerId: customer.id,
      barberId,
      serviceId,
      barberName: "Rayan",
      serviceName: "Knippen",
      priceCents: 2500,
      durationMinutes: 960,
      date: "2026-11-05",
      startTime: "06:00",
      endTime: "22:00",
      status: "APPROVED",
    });
    const alert = await createAvailabilityAlert(
      { serviceId, barberId, date: "2026-11-05", email: "max@example.de", locale: "en" },
      { now: NOW },
    );
    expect(alert.locale).toBe("en");
  });

  it("fills in the translations of the starting treatments for existing installs, without overwriting", async () => {
    const migration = readFileSync(join(process.cwd(), "drizzle/0011_i18n.sql"), "utf8");
    const updates = migration
      .split("--> statement-breakpoint")
      .map((statement) => statement.replace(/^--.*$/gm, "").trim())
      .filter((statement) => statement.startsWith("UPDATE"));
    expect(updates.length).toBe(DEFAULT_SERVICE_TRANSLATIONS.length * 2 + 1);

    // As before the migration, with one treatment renamed and one translated by hand.
    await handle.db.update(services).set({ nameEn: null, nameDe: null, descriptionEn: null, descriptionDe: null });
    await handle.db.update(settings).set({ taglineEn: null, taglineDe: null });
    await handle.db.update(services).set({ name: "Knippen kort" }).where(eq(services.name, "Knippen"));
    await handle.db.update(services).set({ nameEn: "Beard trim" }).where(eq(services.name, "Baard"));

    for (const statement of updates) await handle.db.execute(sql.raw(statement));

    const rows = await handle.db.select().from(services);
    const byName = new Map(rows.map((r) => [r.name, r]));
    expect(byName.get("Skin Fade")).toMatchObject({ nameEn: "Skin Fade", nameDe: "Skin Fade" });
    expect(byName.get("Knippen + Baard")?.descriptionDe).toBe("Das Komplettpaket: Haarschnitt und Bart in Form, mit sauberen Konturen.");
    // Renamed: no translated name, but the unchanged description is translated.
    expect(byName.get("Knippen kort")).toMatchObject({ nameEn: null, descriptionEn: DEFAULT_SERVICE_TRANSLATIONS[0].descriptionEn });
    // Translated by hand: left alone.
    expect(byName.get("Baard")).toMatchObject({ nameEn: "Beard trim", nameDe: null });
    const [row] = await handle.db.select().from(settings);
    expect(row.taglineDe).toBe("Sauber geschnitten. Selbstbewusst unterwegs.");
  });
});
