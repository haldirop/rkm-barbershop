import type { Locale } from "@/i18n/config";
import { email as emailMessages } from "@/i18n/messages/email";
import { capitalize, formatAmount, formatDateLong, formatDateTime, formatPrice } from "@/lib/format";
import { PAYMENT_METHODS, receiptRows, type PaymentMethodKey, type ReceiptInput, type ReceiptRow } from "@/lib/pos";
import type { Appointment, Customer, Settings } from "@/server/db/schema";
import { renderEmail, type EmailContent, type EmailTableRow } from "./layout";

/**
 * All transactional e-mails. Each returns { subject, html, text }. E-mails to the customer
 * are in the language they booked in (ctx.locale); e-mails to the shop are Dutch.
 */

export interface TemplateContext {
  settings: Settings;
  appointment: Appointment;
  customer: Customer;
  links: { manage?: string; book?: string; admin?: string; ics?: string; logo?: string };
  reason?: string | null;
  /** The customer's language (default Dutch). */
  locale?: Locale;
  /** The treatment in the customer's language (default: the name on the appointment). */
  serviceName?: string;
}

export type RenderedEmail = ReturnType<typeof renderEmail>;

const lang = (ctx: TemplateContext): Locale => ctx.locale ?? "nl";
const msg = (ctx: TemplateContext) => emailMessages[lang(ctx)];

/** The appointment as a list for the customer, in their language. */
function details(ctx: TemplateContext): Array<[string, string]> {
  const a = ctx.appointment;
  const locale = lang(ctx);
  const l = msg(ctx).labels;
  return [
    [l.treatment, ctx.serviceName ?? a.serviceName],
    [l.date, capitalize(formatDateLong(a.date, false, locale))],
    [l.time, `${a.startTime.slice(0, 5)} – ${a.endTime.slice(0, 5)}`],
    [l.barber, a.barberName],
    [l.price, formatPrice(a.priceCents, locale)],
  ];
}

/** The appointment with the customer's details, for the shop (Dutch). */
function adminDetails(ctx: TemplateContext): Array<[string, string]> {
  const a = ctx.appointment;
  const c = ctx.customer;
  return [
    ["Klant", `${c.firstName} ${c.lastName}`],
    ["Telefoon", c.phone],
    ...(c.email ? ([["E-mail", c.email]] as Array<[string, string]>) : []),
    ...(ctx.locale && ctx.locale !== "nl"
      ? ([["Taal", ctx.locale === "en" ? "Engels" : "Duits"]] as Array<[string, string]>)
      : []),
    ["Behandeling", a.serviceName],
    ["Datum", capitalize(formatDateLong(a.date))],
    ["Tijd", `${a.startTime.slice(0, 5)} – ${a.endTime.slice(0, 5)}`],
    ["Barber", a.barberName],
    ["Prijs", formatPrice(a.priceCents)],
    ...(a.notes ? ([["Opmerking", a.notes]] as Array<[string, string]>) : []),
  ];
}

function footer(s: Settings, why: string | null): string[] {
  return [
    s.businessName,
    [s.street, [s.postalCode, s.city].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    [s.phone, s.email].filter(Boolean).join(" · "),
    ...(why ? [why] : []),
  ].filter(Boolean);
}

const hi = (ctx: TemplateContext) => msg(ctx).hi(ctx.customer.firstName);
const when = (ctx: TemplateContext) =>
  msg(ctx).when(formatDateLong(ctx.appointment.date, false, lang(ctx)), ctx.appointment.startTime.slice(0, 5));
/** For the shop: always Dutch. */
const whenNl = (ctx: TemplateContext) =>
  `${formatDateLong(ctx.appointment.date)} om ${ctx.appointment.startTime.slice(0, 5)}`;
const manage = (ctx: TemplateContext, label = msg(ctx).manage) =>
  ctx.links.manage ? { label, url: ctx.links.manage } : undefined;
const reason = (ctx: TemplateContext) => (ctx.reason ? [msg(ctx).reason(ctx.reason)] : []);

/** An e-mail to the customer, in their language. */
function email(ctx: TemplateContext, subject: string, content: Omit<EmailContent, "footer">) {
  return renderEmail(subject, {
    ...content,
    footer: footer(ctx.settings, msg(ctx).why(ctx.settings.businessName)),
    logoUrl: ctx.links.logo,
    lang: lang(ctx),
  });
}

/** An e-mail to the shop (Dutch). */
function shopEmail(ctx: TemplateContext, subject: string, content: Omit<EmailContent, "footer">) {
  return renderEmail(subject, { ...content, footer: footer(ctx.settings, null), logoUrl: ctx.links.logo });
}

export const templates = {
  requestReceived: (ctx: TemplateContext) => {
    const t = msg(ctx).requestReceived;
    const business = ctx.settings.businessName;
    return email(ctx, t.subject(business), {
      preheader: t.preheader(when(ctx)),
      heading: t.heading,
      paragraphs: [hi(ctx), t.thanks(business)],
      details: details(ctx),
      note: t.note(business),
      button: manage(ctx, t.button),
    });
  },

  approved: (ctx: TemplateContext) => {
    const m = msg(ctx);
    const t = m.approved;
    const business = ctx.settings.businessName;
    return email(ctx, t.subject(business), {
      preheader: t.preheader(when(ctx)),
      heading: t.heading,
      paragraphs: [hi(ctx), t.text(business)],
      details: details(ctx),
      button: ctx.links.ics ? { label: m.addToCalendar, url: ctx.links.ics } : undefined,
      secondary: manage(ctx, m.manageOrCancel),
      closing: [t.cutoff(ctx.settings.cancellationCutoffHours), t.seeYou],
    });
  },

  rejected: (ctx: TemplateContext) => {
    const t = msg(ctx).rejected;
    const business = ctx.settings.businessName;
    return email(ctx, t.subject(business), {
      preheader: t.preheader,
      heading: t.heading,
      paragraphs: [hi(ctx), t.text(business), ...reason(ctx), t.other],
      details: details(ctx),
      button: ctx.links.book ? { label: t.button, url: ctx.links.book } : undefined,
    });
  },

  cancelledByShop: (ctx: TemplateContext) => {
    const m = msg(ctx);
    const t = m.cancelledByShop;
    const business = ctx.settings.businessName;
    return email(ctx, t.subject(business), {
      preheader: t.preheader(when(ctx)),
      heading: t.heading,
      paragraphs: [hi(ctx), t.text(business), ...reason(ctx), t.sorry],
      details: details(ctx),
      button: ctx.links.book ? { label: m.newAppointment, url: ctx.links.book } : undefined,
    });
  },

  cancelledByCustomer: (ctx: TemplateContext) => {
    const m = msg(ctx);
    const t = m.cancelledByCustomer;
    return email(ctx, t.subject(ctx.settings.businessName), {
      preheader: t.preheader,
      heading: t.heading,
      paragraphs: [hi(ctx), t.text],
      details: details(ctx),
      button: ctx.links.book ? { label: m.newAppointment, url: ctx.links.book } : undefined,
    });
  },

  rescheduleRequested: (ctx: TemplateContext) => {
    const t = msg(ctx).rescheduleRequested;
    return email(ctx, t.subject, {
      preheader: t.preheader(when(ctx)),
      heading: t.heading,
      paragraphs: [hi(ctx), t.text],
      details: details(ctx),
      note: t.note(ctx.settings.businessName),
      button: manage(ctx),
    });
  },

  movedByShop: (ctx: TemplateContext) => {
    const m = msg(ctx);
    const t = m.movedByShop;
    return email(ctx, t.subject(ctx.settings.businessName), {
      preheader: t.preheader(when(ctx)),
      heading: t.heading,
      paragraphs: [hi(ctx), t.text],
      details: details(ctx),
      button: ctx.links.ics ? { label: m.addToCalendar, url: ctx.links.ics } : undefined,
      secondary: manage(ctx, m.manageOrCancel),
    });
  },

  reminder: (ctx: TemplateContext) => {
    const t = msg(ctx).reminder;
    const business = ctx.settings.businessName;
    return email(ctx, t.subject(business), {
      preheader: t.preheader(ctx.appointment.startTime.slice(0, 5), ctx.serviceName ?? ctx.appointment.serviceName),
      heading: t.heading,
      paragraphs: [hi(ctx), t.text(business)],
      details: details(ctx),
      secondary: manage(ctx, t.cantMake),
    });
  },

// --- Voor de zaak -------------------------------------------------------

  newRequestAdmin: (ctx: TemplateContext) =>
    shopEmail(
      ctx,
      `Nieuwe afspraakaanvraag: ${ctx.customer.firstName} ${ctx.customer.lastName}, ${formatDateLong(ctx.appointment.date)} ${ctx.appointment.startTime.slice(0, 5)}`,
      {
        preheader: `${ctx.appointment.serviceName} op ${whenNl(ctx)} — goedkeuren of weigeren.`,
        heading: "Nieuwe afspraakaanvraag",
        paragraphs: ["Er is een nieuwe afspraak aangevraagd. Keur hem goed of weiger hem in het beheer."],
        details: adminDetails(ctx),
        button: ctx.links.admin ? { label: "Bekijk in het beheer", url: ctx.links.admin } : undefined,
      },
    ),

  cancelledByCustomerAdmin: (ctx: TemplateContext) =>
    shopEmail(
      ctx,
      `Geannuleerd door klant: ${ctx.customer.firstName} ${ctx.customer.lastName}, ${formatDateLong(ctx.appointment.date)} ${ctx.appointment.startTime.slice(0, 5)}`,
      {
        preheader: "Het tijdslot is weer vrij.",
        heading: "Een klant heeft geannuleerd",
        paragraphs: [`${ctx.customer.firstName} ${ctx.customer.lastName} heeft de afspraak geannuleerd. Het tijdslot is weer vrij.`],
        details: adminDetails(ctx),
        button: ctx.links.admin ? { label: "Bekijk in het beheer", url: ctx.links.admin } : undefined,
      },
    ),

  rescheduleRequestedAdmin: (ctx: TemplateContext) =>
    shopEmail(
      ctx,
      `Verplaatsingsverzoek: ${ctx.customer.firstName} ${ctx.customer.lastName}`,
      {
        preheader: `Nieuwe tijd: ${whenNl(ctx)} — wacht op je bevestiging.`,
        heading: "Een klant wil de afspraak verplaatsen",
        paragraphs: [
          `${ctx.customer.firstName} ${ctx.customer.lastName} heeft een nieuwe tijd gekozen. De afspraak staat weer op ‘aanvraag’ en wacht op je bevestiging.`,
          ...(ctx.reason ? [ctx.reason] : []),
        ],
        details: adminDetails(ctx),
        button: ctx.links.admin ? { label: "Aanvraag beoordelen", url: ctx.links.admin } : undefined,
      },
    ),
} satisfies Record<string, (ctx: TemplateContext) => RenderedEmail>;

export type TemplateName = keyof typeof templates;

/** "Er is een plek vrijgekomen": for a customer on the waiting list, in the language they signed up in. */
export function availabilityAlertEmail(input: {
  settings: Settings;
  date: string;
  serviceName: string;
  barberName: string | null;
  times: string[];
  bookUrl: string;
  logoUrl?: string;
  locale?: Locale;
}): RenderedEmail {
  const locale = input.locale ?? "nl";
  const m = emailMessages[locale];
  const t = m.alert;
  const day = formatDateLong(input.date, false, locale);
  return renderEmail(t.subject(day), {
    preheader: t.preheader(input.serviceName, day),
    heading: t.heading,
    paragraphs: [t.text(day), t.hurry],
    details: [
      [m.labels.treatment, input.serviceName],
      [m.labels.date, capitalize(day)],
      ...(input.barberName ? ([[m.labels.barber, input.barberName]] as Array<[string, string]>) : []),
      ...(input.times.length ? ([[m.labels.freeTimes, input.times.join(", ")]] as Array<[string, string]>) : []),
    ],
    button: { label: t.button, url: input.bookUrl },
    footer: [...footer(input.settings, null), t.why],
    logoUrl: input.logoUrl,
    lang: locale,
  });
}

const RECEIPT_ROW_STYLE: Record<ReceiptRow["kind"], Omit<EmailTableRow, "label" | "value">> = {
  line: {},
  subtotal: { divider: true },
  discount: {},
  tip: {},
  total: { strong: true, divider: true },
  vat: { muted: true },
};

/** The receipt ("kassabon") after paying at the till, or a refund receipt. */
export function receiptEmail(input: {
  settings: Settings;
  number: number;
  isRefund: boolean;
  /** Receipt number this refund undoes. */
  refundOfNumber?: number | null;
  createdAt: Date;
  barberName: string | null;
  paymentMethod: PaymentMethodKey;
  receipt: ReceiptInput;
  logoUrl?: string;
}): RenderedEmail {
  const s = input.settings;
  const when = formatDateTime(input.createdAt);
  const subject = input.isRefund
    ? `Tegenboeking ${input.number} van ${s.businessName}`
    : `Je kassabon van ${s.businessName}`;
  return renderEmail(subject, {
    preheader: `Bon ${input.number} · ${formatAmount(input.receipt.totalCents)} · ${when}`,
    heading: input.isRefund ? "Tegenboeking" : "Bedankt voor je bezoek",
    paragraphs: [
      input.isRefund
        ? `${input.refundOfNumber ? `Bon ${input.refundOfNumber}` : "Een eerdere bon"} is teruggedraaid. Hieronder zie je de tegenboeking.`
        : `Hieronder vind je je kassabon. Tot de volgende keer bij ${s.businessName}!`,
    ],
    details: [
      ["Bonnummer", String(input.number)],
      ["Datum", when],
      ...(input.barberName ? ([["Barber", input.barberName]] as Array<[string, string]>) : []),
      ["Betaald met", PAYMENT_METHODS[input.paymentMethod]],
    ],
    table: receiptRows(input.receipt).map((row) => ({
      label: row.label,
      value: formatAmount(row.cents),
      ...RECEIPT_ROW_STYLE[row.kind],
    })),
    footer: [
      ...footer(s, null),
      [s.kvkNumber ? `KvK ${s.kvkNumber}` : "", s.vatNumber ? `Btw ${s.vatNumber}` : ""].filter(Boolean).join(" · "),
    ].filter(Boolean),
    logoUrl: input.logoUrl,
  });
}
