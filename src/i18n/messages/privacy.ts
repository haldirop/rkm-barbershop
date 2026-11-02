import type { Locale } from "../config";

export interface PrivacyContext {
  business: string;
  address: string;
  kvk: string;
  /** "info@… of 06…" — e-mail and/or phone, joined in the page language. */
  contact: string;
}

/** The privacy statement. The Dutch version is the legally binding one. */
const nl = {
  eyebrow: "Privacy",
  title: "Privacyverklaring",
  translationNote: null as string | null,
  or: "of",
  sections: (c: PrivacyContext) => [
    {
      heading: "Wie zijn wij",
      body: `${c.business}${c.address ? `, ${c.address}` : ""}${c.kvk ? ` (KvK ${c.kvk})` : ""} is verantwoordelijk voor de verwerking van je persoonsgegevens zoals beschreven in deze verklaring.`,
    },
    {
      heading: "Welke gegevens we verwerken",
      list: [
        "Voor- en achternaam, telefoonnummer en e-mailadres",
        "Gegevens over je afspraak: behandeling, barber, datum, tijd en eventuele opmerkingen",
        "Gegevens over je betaling in de zaak: wat je hebt afgerekend, het bedrag en hoe je hebt betaald",
      ],
    },
    {
      heading: "Waarom",
      body: "We gebruiken deze gegevens uitsluitend om je afspraak te plannen, te bevestigen, je eraan te herinneren en contact met je op te nemen als er iets verandert. De grondslag is de uitvoering van de overeenkomst (je afspraak). We gebruiken je gegevens niet voor marketing en verkopen ze nooit aan derden.",
    },
    {
      heading: "Melding als er plek vrijkomt",
      body: "Is een dag volgeboekt en vraag je om een e-mail als er toch een plek vrijkomt, dan bewaren we alleen je e-mailadres en de dag, behandeling en barber waarvoor je je aanmeldt. Je krijgt daarover één e-mail; na de betreffende dag verwijderen we je aanmelding automatisch.",
    },
    {
      heading: "Hoe lang we gegevens bewaren",
      body: "We bewaren je gegevens zolang je klant bij ons bent en verwijderen ze op verzoek. Gegevens die we wettelijk moeten bewaren (zoals kassabonnen voor de Belastingdienst, in principe 7 jaar) bewaren we zo lang als de wet voorschrijft. Vraag je om verwijdering, dan blijft de bon bestaan maar zonder je naam.",
    },
    {
      heading: "Delen met anderen",
      body: "Voor het hosten van de website en het versturen van e-mails schakelen we zorgvuldig gekozen dienstverleners in. Met hen zijn afspraken gemaakt over de beveiliging van je gegevens.",
    },
    {
      heading: "Cookies",
      body: "Deze website gebruikt geen tracking- of advertentiecookies. Als je ‘gegevens onthouden’ aanvinkt bij het boeken, worden je naam en contactgegevens alleen lokaal in je eigen browser opgeslagen. Kies je een taal met de taalkeuze, dan onthoudt een klein cookie die keuze.",
    },
    {
      heading: "Jouw rechten",
      body: `Je hebt het recht om je gegevens in te zien, te laten corrigeren of te laten verwijderen. Neem hiervoor contact met ons op${c.contact ? ` via ${c.contact}` : ""}. Ben je niet tevreden over hoe we met je gegevens omgaan, dan kun je een klacht indienen bij de Autoriteit Persoonsgegevens.`,
    },
  ],
};

export type PrivacyMessages = typeof nl;

const en: PrivacyMessages = {
  eyebrow: "Privacy",
  title: "Privacy statement",
  translationNote: "This is a translation for your convenience. The Dutch version of this statement is the legally binding one.",
  or: "or",
  sections: (c) => [
    {
      heading: "Who we are",
      body: `${c.business}${c.address ? `, ${c.address}` : ""}${c.kvk ? ` (Dutch Chamber of Commerce no. ${c.kvk})` : ""} is responsible for processing your personal data as described in this statement.`,
    },
    {
      heading: "What data we process",
      list: [
        "First and last name, phone number and email address",
        "Details of your appointment: treatment, barber, date, time and any notes",
        "Details of your payment in the shop: what you paid for, the amount and how you paid",
      ],
    },
    {
      heading: "Why",
      body: "We only use this data to schedule and confirm your appointment, to remind you of it and to contact you if anything changes. The legal basis is the performance of the agreement (your appointment). We don’t use your data for marketing and never sell it to third parties.",
    },
    {
      heading: "Notification when a spot frees up",
      body: "If a day is fully booked and you ask for an email in case a spot frees up, we only store your email address and the day, treatment and barber you signed up for. You’ll get one email about it; after that day we delete your sign-up automatically.",
    },
    {
      heading: "How long we keep data",
      body: "We keep your data for as long as you are a customer and delete it on request. Data we are legally required to keep (such as receipts for the Dutch tax authorities, in principle 7 years) is kept for as long as the law requires. If you ask us to delete your data, the receipt remains but without your name.",
    },
    {
      heading: "Sharing with others",
      body: "To host the website and send emails, we use carefully selected service providers. Agreements have been made with them about keeping your data secure.",
    },
    {
      heading: "Cookies",
      body: "This website doesn’t use tracking or advertising cookies. If you tick ‘remember my details’ when booking, your name and contact details are only stored locally in your own browser. If you choose a language with the language switch, a small cookie remembers that choice.",
    },
    {
      heading: "Your rights",
      body: `You have the right to view, correct or delete your data. To do so, please contact us${c.contact ? ` via ${c.contact}` : ""}. If you are not satisfied with how we handle your data, you can file a complaint with the Dutch Data Protection Authority (Autoriteit Persoonsgegevens).`,
    },
  ],
};

const de: PrivacyMessages = {
  eyebrow: "Datenschutz",
  title: "Datenschutzerklärung",
  translationNote: "Dies ist eine Übersetzung zu deiner Information. Rechtlich verbindlich ist die niederländische Fassung dieser Erklärung.",
  or: "oder",
  sections: (c) => [
    {
      heading: "Wer wir sind",
      body: `${c.business}${c.address ? `, ${c.address}` : ""}${c.kvk ? ` (niederländische Handelskammer, KvK-Nr. ${c.kvk})` : ""} ist für die Verarbeitung deiner personenbezogenen Daten verantwortlich, wie in dieser Erklärung beschrieben.`,
    },
    {
      heading: "Welche Daten wir verarbeiten",
      list: [
        "Vor- und Nachname, Telefonnummer und E-Mail-Adresse",
        "Angaben zu deinem Termin: Leistung, Barber, Datum, Uhrzeit und eventuelle Anmerkungen",
        "Angaben zu deiner Zahlung im Laden: was du bezahlt hast, der Betrag und wie du bezahlt hast",
      ],
    },
    {
      heading: "Warum",
      body: "Wir nutzen diese Daten ausschließlich, um deinen Termin zu planen und zu bestätigen, dich daran zu erinnern und dich zu kontaktieren, falls sich etwas ändert. Rechtsgrundlage ist die Erfüllung des Vertrags (dein Termin). Wir nutzen deine Daten nicht für Werbung und verkaufen sie nie an Dritte.",
    },
    {
      heading: "Benachrichtigung, wenn ein Termin frei wird",
      body: "Ist ein Tag ausgebucht und bittest du um eine E-Mail, falls doch ein Termin frei wird, speichern wir nur deine E-Mail-Adresse sowie Tag, Leistung und Barber, für die du dich anmeldest. Du bekommst dazu eine E-Mail; nach dem betreffenden Tag löschen wir deine Anmeldung automatisch.",
    },
    {
      heading: "Wie lange wir Daten speichern",
      body: "Wir speichern deine Daten, solange du Kunde bei uns bist, und löschen sie auf Wunsch. Daten, die wir gesetzlich aufbewahren müssen (etwa Kassenbelege für die niederländische Steuerbehörde, grundsätzlich 7 Jahre), speichern wir so lange, wie das Gesetz es vorschreibt. Bittest du um Löschung, bleibt der Beleg bestehen, aber ohne deinen Namen.",
    },
    {
      heading: "Weitergabe an andere",
      body: "Für das Hosting der Website und den Versand von E-Mails setzen wir sorgfältig ausgewählte Dienstleister ein. Mit ihnen wurden Vereinbarungen zur Sicherheit deiner Daten getroffen.",
    },
    {
      heading: "Cookies",
      body: "Diese Website verwendet keine Tracking- oder Werbe-Cookies. Wenn du beim Buchen ‘Daten merken’ ankreuzt, werden dein Name und deine Kontaktdaten nur lokal in deinem eigenen Browser gespeichert. Wählst du über die Sprachauswahl eine Sprache, merkt sich ein kleines Cookie diese Wahl.",
    },
    {
      heading: "Deine Rechte",
      body: `Du hast das Recht, deine Daten einzusehen, berichtigen oder löschen zu lassen. Wende dich dazu an uns${c.contact ? ` über ${c.contact}` : ""}. Bist du nicht zufrieden damit, wie wir mit deinen Daten umgehen, kannst du dich bei der niederländischen Datenschutzbehörde (Autoriteit Persoonsgegevens) beschweren.`,
    },
  ],
};

export const privacy: Record<Locale, PrivacyMessages> = { nl, en, de };
