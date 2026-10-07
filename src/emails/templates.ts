import { capitalize, formatDateLong, formatPrice } from "@/lib/format";
import type { Appointment, Customer, Settings } from "@/server/db/schema";
import { renderEmail, type EmailContent } from "./layout";

/** All transactional e-mails, in Dutch. Each returns { subject, html, text }. */

export interface TemplateContext {
  settings: Settings;
  appointment: Appointment;
  customer: Customer;
  links: { manage?: string; book?: string; admin?: string; ics?: string };
  reason?: string | null;
}

export type RenderedEmail = ReturnType<typeof renderEmail>;

function details(ctx: TemplateContext, withCustomer = false): Array<[string, string]> {
  const a = ctx.appointment;
  const c = ctx.customer;
  return [
    ...(withCustomer
      ? ([
          ["Klant", `${c.firstName} ${c.lastName}`],
          ["Telefoon", c.phone],
          ...(c.email ? [["E-mail", c.email]] : []),
        ] as Array<[string, string]>)
      : []),
    ["Behandeling", a.serviceName],
    ["Datum", capitalize(formatDateLong(a.date))],
    ["Tijd", `${a.startTime.slice(0, 5)} – ${a.endTime.slice(0, 5)}`],
    ["Barber", a.barberName],
    ["Prijs", formatPrice(a.priceCents)],
    ...(withCustomer && a.notes ? ([["Opmerking", a.notes]] as Array<[string, string]>) : []),
  ];
}

function footer(s: Settings, forCustomer = true): string[] {
  return [
    s.businessName,
    [s.street, [s.postalCode, s.city].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    [s.phone, s.email].filter(Boolean).join(" · "),
    ...(forCustomer ? [`Je ontvangt deze e-mail omdat je een afspraak hebt bij ${s.businessName}.`] : []),
  ].filter(Boolean);
}

const hi = (ctx: TemplateContext) => `Hoi ${ctx.customer.firstName},`;
const when = (ctx: TemplateContext) =>
  `${formatDateLong(ctx.appointment.date)} om ${ctx.appointment.startTime.slice(0, 5)}`;
const manage = (ctx: TemplateContext, label = "Afspraak bekijken of wijzigen") =>
  ctx.links.manage ? { label, url: ctx.links.manage } : undefined;

function email(ctx: TemplateContext, subject: string, content: Omit<EmailContent, "footer">, forCustomer = true) {
  return renderEmail(subject, { ...content, footer: footer(ctx.settings, forCustomer) });
}

export const templates = {
  requestReceived: (ctx: TemplateContext) =>
    email(ctx, `Je afspraakaanvraag bij ${ctx.settings.businessName} is ontvangen`, {
      preheader: `Aanvraag voor ${when(ctx)} — we laten je snel weten of het lukt.`,
      heading: "Je afspraakaanvraag is ontvangen",
      paragraphs: [hi(ctx), `Bedankt voor je aanvraag bij ${ctx.settings.businessName}.`],
      details: details(ctx),
      note: `Je afspraak is nog niet definitief. Je ontvangt een bevestiging zodra ${ctx.settings.businessName} de aanvraag heeft goedgekeurd.`,
      button: manage(ctx, "Aanvraag bekijken"),
    }),

  approved: (ctx: TemplateContext) =>
    email(ctx, `Je afspraak bij ${ctx.settings.businessName} is bevestigd`, {
      preheader: `Bevestigd: ${when(ctx)}. Tot dan!`,
      heading: "Je afspraak is bevestigd",
      paragraphs: [hi(ctx), `Je afspraak bij ${ctx.settings.businessName} is bevestigd.`],
      details: details(ctx),
      button: ctx.links.ics ? { label: "Zet in je agenda", url: ctx.links.ics } : undefined,
      secondary: manage(ctx, "Afspraak wijzigen of annuleren"),
      closing: [
        `Kun je toch niet? Laat het ons uiterlijk ${ctx.settings.cancellationCutoffHours} uur van tevoren weten via de link hierboven.`,
        "Tot dan!",
      ],
    }),

  rejected: (ctx: TemplateContext) =>
    email(ctx, `Je afspraak bij ${ctx.settings.businessName} kon helaas niet worden bevestigd`, {
      preheader: "Kies gerust een ander moment.",
      heading: "Je afspraak kon helaas niet worden bevestigd",
      paragraphs: [
        hi(ctx),
        `Je afspraak bij ${ctx.settings.businessName} kon helaas niet worden bevestigd.`,
        ...(ctx.reason ? [`Toelichting: ${ctx.reason}`] : []),
        "Kies gerust een ander moment — we helpen je graag.",
      ],
      details: details(ctx),
      button: ctx.links.book ? { label: "Kies een ander moment", url: ctx.links.book } : undefined,
    }),

  cancelledByShop: (ctx: TemplateContext) =>
    email(ctx, `Je afspraak bij ${ctx.settings.businessName} is geannuleerd`, {
      preheader: `Je afspraak van ${when(ctx)} is geannuleerd.`,
      heading: "Je afspraak is geannuleerd",
      paragraphs: [
        hi(ctx),
        `Helaas moeten we je afspraak bij ${ctx.settings.businessName} annuleren.`,
        ...(ctx.reason ? [`Toelichting: ${ctx.reason}`] : []),
        "Onze excuses voor het ongemak. Plan gerust een nieuw moment in.",
      ],
      details: details(ctx),
      button: ctx.links.book ? { label: "Nieuwe afspraak maken", url: ctx.links.book } : undefined,
    }),

  cancelledByCustomer: (ctx: TemplateContext) =>
    email(ctx, `Je afspraak bij ${ctx.settings.businessName} is geannuleerd`, {
      preheader: "Bedankt dat je het ons liet weten.",
      heading: "Je afspraak is geannuleerd",
      paragraphs: [hi(ctx), "Je hebt de onderstaande afspraak geannuleerd. Bedankt dat je het ons liet weten."],
      details: details(ctx),
      button: ctx.links.book ? { label: "Nieuwe afspraak maken", url: ctx.links.book } : undefined,
    }),

  rescheduleRequested: (ctx: TemplateContext) =>
    email(ctx, "Je nieuwe afspraaktijd is ontvangen", {
      preheader: `Nieuwe tijd: ${when(ctx)} — nog te bevestigen.`,
      heading: "We hebben je nieuwe tijd ontvangen",
      paragraphs: [hi(ctx), "Je wilt je afspraak verplaatsen naar het onderstaande moment."],
      details: details(ctx),
      note: `Je nieuwe tijd is nog niet definitief. Je ontvangt een bevestiging zodra ${ctx.settings.businessName} hem heeft goedgekeurd.`,
      button: manage(ctx),
    }),

  movedByShop: (ctx: TemplateContext) =>
    email(ctx, `Je afspraak bij ${ctx.settings.businessName} is gewijzigd`, {
      preheader: `Nieuwe tijd: ${when(ctx)}.`,
      heading: "Je afspraak is gewijzigd",
      paragraphs: [hi(ctx), "In overleg is je afspraak aangepast. Dit zijn de nieuwe gegevens:"],
      details: details(ctx),
      button: ctx.links.ics ? { label: "Zet in je agenda", url: ctx.links.ics } : undefined,
      secondary: manage(ctx, "Afspraak wijzigen of annuleren"),
    }),

  reminder: (ctx: TemplateContext) =>
    email(ctx, `Herinnering: morgen heb je een afspraak bij ${ctx.settings.businessName}`, {
      preheader: `Morgen om ${ctx.appointment.startTime.slice(0, 5)}: ${ctx.appointment.serviceName}.`,
      heading: "Tot morgen!",
      paragraphs: [hi(ctx), `Herinnering: morgen heb je een afspraak bij ${ctx.settings.businessName}.`],
      details: details(ctx),
      secondary: manage(ctx, "Kun je toch niet? Afspraak wijzigen of annuleren"),
    }),

  // --- Voor de zaak -------------------------------------------------------

  newRequestAdmin: (ctx: TemplateContext) =>
    email(
      ctx,
      `Nieuwe afspraakaanvraag: ${ctx.customer.firstName} ${ctx.customer.lastName}, ${formatDateLong(ctx.appointment.date)} ${ctx.appointment.startTime.slice(0, 5)}`,
      {
        preheader: `${ctx.appointment.serviceName} op ${when(ctx)} — goedkeuren of weigeren.`,
        heading: "Nieuwe afspraakaanvraag",
        paragraphs: ["Er is een nieuwe afspraak aangevraagd. Keur hem goed of weiger hem in het beheer."],
        details: details(ctx, true),
        button: ctx.links.admin ? { label: "Bekijk in het beheer", url: ctx.links.admin } : undefined,
      },
      false,
    ),

  cancelledByCustomerAdmin: (ctx: TemplateContext) =>
    email(
      ctx,
      `Geannuleerd door klant: ${ctx.customer.firstName} ${ctx.customer.lastName}, ${formatDateLong(ctx.appointment.date)} ${ctx.appointment.startTime.slice(0, 5)}`,
      {
        preheader: "Het tijdslot is weer vrij.",
        heading: "Een klant heeft geannuleerd",
        paragraphs: [`${ctx.customer.firstName} ${ctx.customer.lastName} heeft de afspraak geannuleerd. Het tijdslot is weer vrij.`],
        details: details(ctx, true),
        button: ctx.links.admin ? { label: "Bekijk in het beheer", url: ctx.links.admin } : undefined,
      },
      false,
    ),

  rescheduleRequestedAdmin: (ctx: TemplateContext) =>
    email(
      ctx,
      `Verplaatsingsverzoek: ${ctx.customer.firstName} ${ctx.customer.lastName}`,
      {
        preheader: `Nieuwe tijd: ${when(ctx)} — wacht op je bevestiging.`,
        heading: "Een klant wil de afspraak verplaatsen",
        paragraphs: [
          `${ctx.customer.firstName} ${ctx.customer.lastName} heeft een nieuwe tijd gekozen. De afspraak staat weer op ‘aanvraag’ en wacht op je bevestiging.`,
          ...(ctx.reason ? [ctx.reason] : []),
        ],
        details: details(ctx, true),
        button: ctx.links.admin ? { label: "Aanvraag beoordelen", url: ctx.links.admin } : undefined,
      },
      false,
    ),
} satisfies Record<string, (ctx: TemplateContext) => RenderedEmail>;

export type TemplateName = keyof typeof templates;
