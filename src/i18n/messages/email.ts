import type { Locale } from "../config";

/** E-mails to customers (the ones to the shop itself stay Dutch, see emails/templates.ts). */
const nl = {
  labels: { treatment: "Behandeling", date: "Datum", time: "Tijd", barber: "Barber", price: "Prijs", freeTimes: "Vrije tijden" },
  hi: (name: string) => `Hoi ${name},`,
  when: (date: string, time: string) => `${date} om ${time}`,
  why: (business: string) => `Je ontvangt deze e-mail omdat je een afspraak hebt bij ${business}.`,
  reason: (reason: string) => `Toelichting: ${reason}`,
  manage: "Afspraak bekijken of wijzigen",
  manageOrCancel: "Afspraak wijzigen of annuleren",
  addToCalendar: "Zet in je agenda",
  newAppointment: "Nieuwe afspraak maken",
  requestReceived: {
    subject: (business: string) => `Je afspraakaanvraag bij ${business} is ontvangen`,
    preheader: (when: string) => `Aanvraag voor ${when} — we laten je snel weten of het lukt.`,
    heading: "Je afspraakaanvraag is ontvangen",
    thanks: (business: string) => `Bedankt voor je aanvraag bij ${business}.`,
    note: (business: string) =>
      `Je afspraak is nog niet definitief. Je ontvangt een bevestiging zodra ${business} de aanvraag heeft goedgekeurd.`,
    button: "Aanvraag bekijken",
  },
  approved: {
    subject: (business: string) => `Je afspraak bij ${business} is bevestigd`,
    preheader: (when: string) => `Bevestigd: ${when}. Tot dan!`,
    heading: "Je afspraak is bevestigd",
    text: (business: string) => `Je afspraak bij ${business} is bevestigd.`,
    cutoff: (hours: number) =>
      `Kun je toch niet? Laat het ons uiterlijk ${hours} uur van tevoren weten via de link hierboven.`,
    seeYou: "Tot dan!",
  },
  rejected: {
    subject: (business: string) => `Je afspraak bij ${business} kon helaas niet worden bevestigd`,
    preheader: "Kies gerust een ander moment.",
    heading: "Je afspraak kon helaas niet worden bevestigd",
    text: (business: string) => `Je afspraak bij ${business} kon helaas niet worden bevestigd.`,
    other: "Kies gerust een ander moment — we helpen je graag.",
    button: "Kies een ander moment",
  },
  cancelledByShop: {
    subject: (business: string) => `Je afspraak bij ${business} is geannuleerd`,
    preheader: (when: string) => `Je afspraak van ${when} is geannuleerd.`,
    heading: "Je afspraak is geannuleerd",
    text: (business: string) => `Helaas moeten we je afspraak bij ${business} annuleren.`,
    sorry: "Onze excuses voor het ongemak. Plan gerust een nieuw moment in.",
  },
  cancelledByCustomer: {
    subject: (business: string) => `Je afspraak bij ${business} is geannuleerd`,
    preheader: "Bedankt dat je het ons liet weten.",
    heading: "Je afspraak is geannuleerd",
    text: "Je hebt de onderstaande afspraak geannuleerd. Bedankt dat je het ons liet weten.",
  },
  rescheduleRequested: {
    subject: "Je nieuwe afspraaktijd is ontvangen",
    preheader: (when: string) => `Nieuwe tijd: ${when} — nog te bevestigen.`,
    heading: "We hebben je nieuwe tijd ontvangen",
    text: "Je wilt je afspraak verplaatsen naar het onderstaande moment.",
    note: (business: string) =>
      `Je nieuwe tijd is nog niet definitief. Je ontvangt een bevestiging zodra ${business} hem heeft goedgekeurd.`,
  },
  movedByShop: {
    subject: (business: string) => `Je afspraak bij ${business} is gewijzigd`,
    preheader: (when: string) => `Nieuwe tijd: ${when}.`,
    heading: "Je afspraak is gewijzigd",
    text: "In overleg is je afspraak aangepast. Dit zijn de nieuwe gegevens:",
  },
  reminder: {
    subject: (business: string) => `Herinnering: morgen heb je een afspraak bij ${business}`,
    preheader: (time: string, service: string) => `Morgen om ${time}: ${service}.`,
    heading: "Tot morgen!",
    text: (business: string) => `Herinnering: morgen heb je een afspraak bij ${business}.`,
    cantMake: "Kun je toch niet? Afspraak wijzigen of annuleren",
  },
  alert: {
    subject: (day: string) => `Er is een plek vrijgekomen op ${day}`,
    preheader: (service: string, day: string) => `Goed nieuws: ${service} op ${day} is weer te boeken. Wees er snel bij.`,
    heading: "Er is een plek vrijgekomen",
    text: (day: string) =>
      `Goed nieuws! Je wilde graag weten of er op ${day} nog plek zou komen. Dat is gelukt: er is weer een moment vrij.`,
    hurry: "Wie als eerste boekt, krijgt de plek. Wacht dus niet te lang.",
    button: "Nu boeken",
    why: "Je ontvangt deze eenmalige e-mail omdat je je op onze website hebt aangemeld voor een melding.",
  },
  calendar: {
    summary: (service: string, business: string) => `${service} bij ${business}`,
    description: (barber: string, url: string) => `Barber: ${barber}\nWijzigen of annuleren: ${url}`,
    alarm: (business: string) => `Afspraak bij ${business}`,
    notFound: "Afspraak niet gevonden of nog niet bevestigd.",
    filename: "afspraak-rkm-barbershop.ics",
  },
};

export type EmailMessages = typeof nl;

const en: EmailMessages = {
  labels: { treatment: "Treatment", date: "Date", time: "Time", barber: "Barber", price: "Price", freeTimes: "Free times" },
  hi: (name) => `Hi ${name},`,
  when: (date, time) => `${date} at ${time}`,
  why: (business) => `You’re receiving this email because you have an appointment at ${business}.`,
  reason: (reason) => `Note from the shop: ${reason}`,
  manage: "View or change your appointment",
  manageOrCancel: "Change or cancel your appointment",
  addToCalendar: "Add to your calendar",
  newAppointment: "Book a new appointment",
  requestReceived: {
    subject: (business) => `Your appointment request at ${business} has been received`,
    preheader: (when) => `Request for ${when} — we’ll let you know soon if it works out.`,
    heading: "Your appointment request has been received",
    thanks: (business) => `Thank you for your request at ${business}.`,
    note: (business) =>
      `Your appointment isn’t final yet. You’ll get a confirmation as soon as ${business} has approved the request.`,
    button: "View request",
  },
  approved: {
    subject: (business) => `Your appointment at ${business} is confirmed`,
    preheader: (when) => `Confirmed: ${when}. See you then!`,
    heading: "Your appointment is confirmed",
    text: (business) => `Your appointment at ${business} is confirmed.`,
    cutoff: (hours) => `Can’t make it after all? Let us know at least ${hours} hours in advance via the link above.`,
    seeYou: "See you then!",
  },
  rejected: {
    subject: (business) => `Unfortunately your appointment at ${business} couldn’t be confirmed`,
    preheader: "Feel free to choose another time.",
    heading: "Unfortunately your appointment couldn’t be confirmed",
    text: (business) => `Unfortunately your appointment at ${business} couldn’t be confirmed.`,
    other: "Feel free to choose another time — we’re happy to help.",
    button: "Choose another time",
  },
  cancelledByShop: {
    subject: (business) => `Your appointment at ${business} has been cancelled`,
    preheader: (when) => `Your appointment on ${when} has been cancelled.`,
    heading: "Your appointment has been cancelled",
    text: (business) => `Unfortunately we have to cancel your appointment at ${business}.`,
    sorry: "We apologise for the inconvenience. Feel free to book a new time.",
  },
  cancelledByCustomer: {
    subject: (business) => `Your appointment at ${business} has been cancelled`,
    preheader: "Thanks for letting us know.",
    heading: "Your appointment has been cancelled",
    text: "You’ve cancelled the appointment below. Thanks for letting us know.",
  },
  rescheduleRequested: {
    subject: "Your new appointment time has been received",
    preheader: (when) => `New time: ${when} — to be confirmed.`,
    heading: "We’ve received your new time",
    text: "You’d like to move your appointment to the time below.",
    note: (business) =>
      `Your new time isn’t final yet. You’ll get a confirmation as soon as ${business} has approved it.`,
  },
  movedByShop: {
    subject: (business) => `Your appointment at ${business} has been changed`,
    preheader: (when) => `New time: ${when}.`,
    heading: "Your appointment has been changed",
    text: "As agreed, your appointment has been changed. These are the new details:",
  },
  reminder: {
    subject: (business) => `Reminder: you have an appointment at ${business} tomorrow`,
    preheader: (time, service) => `Tomorrow at ${time}: ${service}.`,
    heading: "See you tomorrow!",
    text: (business) => `Reminder: tomorrow you have an appointment at ${business}.`,
    cantMake: "Can’t make it after all? Change or cancel your appointment",
  },
  alert: {
    subject: (day) => `A spot has opened up on ${day}`,
    preheader: (service, day) => `Good news: ${service} on ${day} can be booked again. Be quick.`,
    heading: "A spot has opened up",
    text: (day) => `Good news! You wanted to know if a spot would open up on ${day}. It has: there’s a free time again.`,
    hurry: "Whoever books first gets the spot, so don’t wait too long.",
    button: "Book now",
    why: "You’re receiving this one-off email because you signed up for a notification on our website.",
  },
  calendar: {
    summary: (service, business) => `${service} at ${business}`,
    description: (barber, url) => `Barber: ${barber}\nChange or cancel: ${url}`,
    alarm: (business) => `Appointment at ${business}`,
    notFound: "Appointment not found or not confirmed yet.",
    filename: "appointment-rkm-barbershop.ics",
  },
};

const de: EmailMessages = {
  labels: { treatment: "Leistung", date: "Datum", time: "Uhrzeit", barber: "Barber", price: "Preis", freeTimes: "Freie Zeiten" },
  hi: (name) => `Hallo ${name},`,
  when: (date, time) => `${date} um ${time}`,
  why: (business) => `Du bekommst diese E-Mail, weil du einen Termin bei ${business} hast.`,
  reason: (reason) => `Hinweis vom Laden: ${reason}`,
  manage: "Termin ansehen oder ändern",
  manageOrCancel: "Termin ändern oder stornieren",
  addToCalendar: "In den Kalender eintragen",
  newAppointment: "Neuen Termin buchen",
  requestReceived: {
    subject: (business) => `Deine Terminanfrage bei ${business} ist eingegangen`,
    preheader: (when) => `Anfrage für ${when} — wir sagen dir bald, ob es klappt.`,
    heading: "Deine Terminanfrage ist eingegangen",
    thanks: (business) => `Danke für deine Anfrage bei ${business}.`,
    note: (business) =>
      `Dein Termin ist noch nicht verbindlich. Du bekommst eine Bestätigung, sobald ${business} die Anfrage angenommen hat.`,
    button: "Anfrage ansehen",
  },
  approved: {
    subject: (business) => `Dein Termin bei ${business} ist bestätigt`,
    preheader: (when) => `Bestätigt: ${when}. Bis dann!`,
    heading: "Dein Termin ist bestätigt",
    text: (business) => `Dein Termin bei ${business} ist bestätigt.`,
    cutoff: (hours) =>
      `Klappt es doch nicht? Sag uns spätestens ${hours} Stunden vorher über den Link oben Bescheid.`,
    seeYou: "Bis dann!",
  },
  rejected: {
    subject: (business) => `Dein Termin bei ${business} konnte leider nicht bestätigt werden`,
    preheader: "Wähle gern einen anderen Zeitpunkt.",
    heading: "Dein Termin konnte leider nicht bestätigt werden",
    text: (business) => `Dein Termin bei ${business} konnte leider nicht bestätigt werden.`,
    other: "Wähle gern einen anderen Zeitpunkt — wir helfen dir gern.",
    button: "Anderen Zeitpunkt wählen",
  },
  cancelledByShop: {
    subject: (business) => `Dein Termin bei ${business} wurde storniert`,
    preheader: (when) => `Dein Termin am ${when} wurde storniert.`,
    heading: "Dein Termin wurde storniert",
    text: (business) => `Leider müssen wir deinen Termin bei ${business} stornieren.`,
    sorry: "Entschuldige die Umstände. Buche gern einen neuen Termin.",
  },
  cancelledByCustomer: {
    subject: (business) => `Dein Termin bei ${business} wurde storniert`,
    preheader: "Danke, dass du uns Bescheid gegeben hast.",
    heading: "Dein Termin wurde storniert",
    text: "Du hast den folgenden Termin storniert. Danke, dass du uns Bescheid gegeben hast.",
  },
  rescheduleRequested: {
    subject: "Deine neue Terminzeit ist eingegangen",
    preheader: (when) => `Neue Zeit: ${when} — noch zu bestätigen.`,
    heading: "Wir haben deine neue Zeit erhalten",
    text: "Du möchtest deinen Termin auf den folgenden Zeitpunkt verschieben.",
    note: (business) =>
      `Deine neue Zeit ist noch nicht verbindlich. Du bekommst eine Bestätigung, sobald ${business} sie angenommen hat.`,
  },
  movedByShop: {
    subject: (business) => `Dein Termin bei ${business} wurde geändert`,
    preheader: (when) => `Neue Zeit: ${when}.`,
    heading: "Dein Termin wurde geändert",
    text: "Wie abgesprochen wurde dein Termin angepasst. Das sind die neuen Angaben:",
  },
  reminder: {
    subject: (business) => `Erinnerung: Morgen hast du einen Termin bei ${business}`,
    preheader: (time, service) => `Morgen um ${time}: ${service}.`,
    heading: "Bis morgen!",
    text: (business) => `Erinnerung: Morgen hast du einen Termin bei ${business}.`,
    cantMake: "Klappt es doch nicht? Termin ändern oder stornieren",
  },
  alert: {
    subject: (day) => `Am ${day} ist ein Termin frei geworden`,
    preheader: (service, day) => `Gute Nachricht: ${service} am ${day} ist wieder buchbar. Sei schnell.`,
    heading: "Ein Termin ist frei geworden",
    text: (day) =>
      `Gute Nachricht! Du wolltest wissen, ob am ${day} noch ein Termin frei wird. Es hat geklappt: Es ist wieder etwas frei.`,
    hurry: "Wer zuerst bucht, bekommt den Termin. Warte also nicht zu lange.",
    button: "Jetzt buchen",
    why: "Du bekommst diese einmalige E-Mail, weil du dich auf unserer Website für eine Benachrichtigung angemeldet hast.",
  },
  calendar: {
    summary: (service, business) => `${service} bei ${business}`,
    description: (barber, url) => `Barber: ${barber}\nÄndern oder stornieren: ${url}`,
    alarm: (business) => `Termin bei ${business}`,
    notFound: "Termin nicht gefunden oder noch nicht bestätigt.",
    filename: "termin-rkm-barbershop.ics",
  },
};

export const email: Record<Locale, EmailMessages> = { nl, en, de };
