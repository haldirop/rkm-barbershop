import { describe, expect, it } from "vitest";
import { templates, type TemplateContext } from "@/emails/templates";
import { MailError, ResendMailProvider } from "@/server/notifications/mailer";
import type { Appointment, Customer, Settings } from "@/server/db/schema";

const ctx = {
  settings: {
    businessName: "RKM Barbershop",
    phone: "020 000 0000",
    email: "info@rkm.test",
    street: "Voorbeeldstraat 12",
    postalCode: "1234 AB",
    city: "Amsterdam",
    cancellationCutoffHours: 24,
  } as Settings,
  appointment: {
    id: "a1",
    serviceName: "Knippen + Baard",
    barberName: "Rayan",
    priceCents: 3750,
    date: "2026-10-14",
    startTime: "15:30:00",
    endTime: "16:15:00",
    notes: null,
  } as Appointment,
  customer: { firstName: "Jan<script>", lastName: "Jansen", phone: "0612345678", email: "jan@example.com" } as Customer,
  links: { manage: "https://rkm.test/afspraak/x", ics: "https://rkm.test/ics", book: "https://rkm.test/boek" },
} satisfies TemplateContext;

describe("e-mail templates", () => {
  it("contains the appointment details and the 'not yet final' notice", () => {
    const mail = templates.requestReceived(ctx);
    expect(mail.subject).toBe("Je afspraakaanvraag bij RKM Barbershop is ontvangen");
    expect(mail.text).toContain("Behandeling: Knippen + Baard");
    expect(mail.text).toContain("Datum: Woensdag 14 oktober");
    expect(mail.text).toContain("Tijd: 15:30 – 16:15");
    expect(mail.text).toContain("Je afspraak is nog niet definitief");
  });

  it("escapes customer input in the HTML", () => {
    const html = templates.approved(ctx).html;
    expect(html).not.toContain("<script>");
    expect(html).toContain("Jan&lt;script&gt;");
    expect(templates.approved(ctx).text).toContain("Tot dan!");
  });

  it("sends the reminder as 'morgen'", () => {
    expect(templates.reminder(ctx).subject).toBe("Herinnering: morgen heb je een afspraak bij RKM Barbershop");
  });
});

describe("Resend provider", () => {
  const config = { resendApiKey: "re_test", from: "RKM Barbershop <afspraken@rkm.test>" };
  const message = { to: "jan@example.com", subject: "Test", html: "<p>Hoi</p>", text: "Hoi", replyTo: "info@rkm.test" };

  it("posts the message to the Resend API", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const provider = new ResendMailProvider(config, (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ id: "email_1" }), { status: 200 });
    }) as typeof fetch);
    await provider.send(message);
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({
      from: config.from,
      to: ["jan@example.com"],
      subject: "Test",
      reply_to: "info@rkm.test",
    });
  });

  it("explains a domain that is not verified yet", async () => {
    const provider = new ResendMailProvider(config, (async () =>
      new Response(JSON.stringify({ statusCode: 403, name: "validation_error", message: "The rkm.test domain is not verified. Please, add and verify your domain." }), { status: 403 })) as unknown as typeof fetch);
    await expect(provider.send(message)).rejects.toThrow(/nog niet geverifieerd/);
  });

  it("retries once when Resend is temporarily unavailable", async () => {
    let attempts = 0;
    const provider = new ResendMailProvider(config, (async () => {
      attempts++;
      return attempts === 1
        ? new Response(JSON.stringify({ name: "rate_limit_exceeded", message: "Too many requests" }), { status: 429 })
        : new Response(JSON.stringify({ id: "email_2" }), { status: 200 });
    }) as typeof fetch);
    await provider.send(message);
    expect(attempts).toBe(2);
  });

  it("does not retry an invalid API key", async () => {
    let attempts = 0;
    const provider = new ResendMailProvider(config, (async () => {
      attempts++;
      return new Response(JSON.stringify({ name: "missing_api_key", message: "Missing API key" }), { status: 401 });
    }) as typeof fetch);
    await expect(provider.send(message)).rejects.toBeInstanceOf(MailError);
    expect(attempts).toBe(1);
  });
});
