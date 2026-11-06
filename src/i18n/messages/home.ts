import type { Locale } from "../config";

/** Homepage sections, the treatments page and the page titles for search engines (server only). */
const nl = {
  meta: {
    title: (business: string, place: string) => `${business} | Professionele Barbershop${place}`,
    place: (city: string) => ` in ${city}`,
    description: (business: string, place: string) =>
      `${business}: professionele barbershop${place}. Knippen, skin fades en baardverzorging met vakmanschap. Maak eenvoudig online een afspraak.`,
    keywords: (city: string) =>
      ["barbershop", "barber", "kapper", "herenkapper", "skin fade", "baard trimmen", ...(city ? [`barbershop ${city}`, `kapper ${city}`] : [])],
    treatmentsTitle: "Behandelingen & prijzen",
    treatmentsDescription: (business: string, place: string) =>
      `Knippen, skin fade, baard trimmen en hot towel shave bij ${business}${place}. Bekijk alle behandelingen, prijzen en duur, en boek direct online.`,
    bookingTitle: "Afspraak maken",
    bookingDescription:
      "Maak online een afspraak bij RKM Barbershop. Kies je behandeling, barber en een moment dat jou uitkomt — direct zichtbaar welke tijden beschikbaar zijn.",
    manageTitle: "Je afspraak",
    privacyTitle: "Privacyverklaring",
    privacyDescription: "Hoe RKM Barbershop omgaat met je persoonsgegevens bij het maken van een afspraak.",
  },
  hero: {
    intro:
      "Vakmanschap in knippen, fades en baardverzorging. Neem plaats, ontspan, en laat het detailwerk aan ons over. Je afspraak regel je in een minuut online.",
    seeAvailability: "Beschikbaarheid bekijken",
    location: (city: string) => `Barbershop in ${city}`,
    bestTitle: "Vrije tijden",
    bestSubtitle: "kies een dag en zie alle tijden",
    bestEmpty: "Er zijn op dit moment geen vrije plekken online. Bel ons gerust, dan kijken we samen.",
    bestNote: "Tik op een tijd om direct je afspraak te maken.",
    dayFull: "Deze dag is helaas vol.",
    dayFullLink: "Krijg een e-mail als er een plek vrijkomt",
  },
  about: {
    eyebrow: "Over RKM Barbershop",
    titleLine: "Vakmanschap,",
    titleAccent: "zonder haast.",
    paragraphs: [
      "RKM Barbershop is een plek waar je even tot rust komt. We nemen de tijd om te luisteren, adviseren eerlijk en werken met oog voor detail — van de eerste knip tot de laatste lijn met het mes.",
      "Of je nu komt voor je vaste knipbeurt, een strakke skin fade of een verzorgde baard: je afspraak staat vast en je wordt op tijd geholpen.",
    ],
    steps: [
      { title: "Even afstemmen", text: "Jouw wens staat voorop. Vertel wat je in gedachten hebt of laat een foto zien, dan maken wij het waar." },
      { title: "Precisiewerk", text: "Schaar, tondeuse en mes, met aandacht voor elke overgang en elke lijn." },
      { title: "Strak afgewerkt", text: "Styling, zodat je look ook thuis goed blijft zitten." },
    ],
  },
  barber: {
    eyebrowTeam: "Het team",
    eyebrowSolo: "Je barber",
    meet: ["Maak kennis met", ""] as [before: string, after: string],
    team: (owner: string) => [
      `${owner} is de eigenaar van RKM Barbershop. Hij knipt al twintig jaar en is gecertificeerd barber. Van een klassieke herensnit tot een strakke skin fade of een baard in model: je bent in ervaren handen.`,
      "Je kiest zelf bij wie je zit. Ga je steeds naar dezelfde barber, dan hoef je niet elke keer opnieuw uit te leggen hoe je het wilt.",
    ],
    solo: (owner: string) => [
      `Bij RKM Barbershop zit je altijd bij ${owner}. Hij is de eigenaar van de zaak, knipt al twintig jaar en is gecertificeerd barber. Van een klassieke herensnit tot een strakke skin fade of een baard in model: je bent in ervaren handen.`,
      `Omdat je steeds door dezelfde barber wordt geholpen, hoef je niet elke keer opnieuw uit te leggen hoe je het wilt. ${owner} kent je stijl en denkt met je mee, zodat het elke keer klopt.`,
    ],
    facts: [
      { value: "20 jaar", label: "ervaring als barber" },
      { value: "Gecertificeerd", label: "barber" },
      { value: "Eigenaar", label: "van de zaak" },
    ],
    bookWith: (name: string) => `Maak een afspraak bij ${name}`,
    ownerRole: "Eigenaar & barber",
    alsoInTeam: "Ook in het team",
    bookWithShort: (name: string) => `Afspraak bij ${name}`,
  },
  services: {
    eyebrow: "Onze behandelingen",
    title: "Van klassiek tot messcherp",
    intro:
      "Kies je behandeling en boek direct een moment dat jou uitkomt. De tijd die we nodig hebben, reserveren we ook echt voor je.",
    bookThis: "— boek deze behandeling",
  },
  whyUs: {
    eyebrow: "Waarom RKM?",
    title: "De details maken het verschil",
    reasons: [
      { title: "Vakmanschap", text: "Twintig jaar ervaring in fades, klassieke cuts en baardwerk, tot in de puntjes verzorgd." },
      {
        title: "Afspraak of binnenlopen",
        text: "Met een afspraak zit je op een vast moment in de stoel. Geen afspraak? Loop gerust binnen: als er tijd is, helpen we je meteen.",
      },
      {
        title: "Persoonlijk advies",
        text: "We denken mee over je haartype, gezichtsvorm en stijl. Wat je met ons advies doet, kies je helemaal zelf.",
      },
      { title: "Hygiëne & kwaliteit", text: "Schone werkplekken, gedesinfecteerde materialen en verzorgende producten." },
    ],
  },
  availability: {
    eyebrow: "Beschikbaarheid",
    title: "Wanneer kun je terecht?",
    intro: (service: string | null) =>
      `Live uit onze agenda${service ? ` voor ${service.toLowerCase()}` : ""}. Kies een dag om direct de vrije tijden te zien.`,
    from: (time: string) => `vanaf ${time}`,
    fullHint: "meld je aan voor een bericht als er plek vrijkomt",
    tipLabel: "Tip:",
    tip: (day: string, date: string | null) => `de meeste ruimte is er ${day}${date ? ` (${date})` : ""}.`,
    busy: "De komende dagen is het druk. Bel ons gerust, dan zoeken we samen een moment.",
    allTimes: "Alle tijden bekijken",
  },
  prices: {
    eyebrow: "Prijzen",
    title: "Helder geprijsd",
    intro:
      "Geen verrassingen achteraf. Alle prijzen zijn inclusief btw; de tijd die bij een behandeling staat, is volledig voor jou gereserveerd.",
    bookNow: "Boek nu",
  },
  reviews: {
    eyebrow: "Reviews",
    title: "Wat klanten zeggen",
    allOnGoogle: "Alle reviews op Google",
    write: "Schrijf een review",
    invite: "Ben je bij ons geweest? We horen graag wat je ervan vond.",
    stars: (rating: number) => `${rating} van 5 sterren`,
    example: "Voorbeeld",
  },
  contact: {
    eyebrow: "Contact & locatie",
    title: "Kom langs",
    intro: "Online boeken is het snelst. Liever even bellen of een vraag stellen? Dat kan natuurlijk ook.",
    details: "Contactgegevens",
    phone: "Telefoon",
    email: "E-mail",
    address: "Adres",
    hours: "Openingstijden",
    location: "Locatie",
    directions: "Routebeschrijving",
  },
  cta: {
    titleStart: "Klaar voor een",
    titleAccent: "frisse look?",
    text: "Kies je behandeling, je barber en een moment dat jou uitkomt. Binnen een minuut geregeld.",
  },
  treatments: {
    eyebrow: "Behandelingen & prijzen",
    title: "Vakwerk, tot in de details",
    intro:
      "Bij elke behandeling staat jouw wens voorop. De tijd die erbij staat, is volledig voor jou gereserveerd. Kies een behandeling om direct de beschikbare tijden te zien.",
    priceList: "Prijslijst",
    vatIncluded: "Alle prijzen zijn inclusief btw.",
  },
  booking: {
    eyebrow: "Online boeken",
    title: "Afspraak maken",
    unavailable: (phone: string) =>
      `Online boeken is op dit moment niet mogelijk. Bel ons gerust${phone ? ` op ${phone}` : ""}.`,
  },
};

export type HomeMessages = typeof nl;

const en: HomeMessages = {
  meta: {
    title: (business, place) => `${business} | Professional Barbershop${place}`,
    place: (city) => ` in ${city}`,
    description: (business, place) =>
      `${business}: professional barbershop${place}. Haircuts, skin fades and beard care with real craftsmanship. Book your appointment online in a minute.`,
    keywords: (city) =>
      ["barbershop", "barber", "men's haircut", "skin fade", "beard trim", ...(city ? [`barbershop ${city}`, `barber ${city}`] : [])],
    treatmentsTitle: "Treatments & prices",
    treatmentsDescription: (business, place) =>
      `Haircuts, skin fades, beard trims and hot towel shaves at ${business}${place}. See every treatment with its price and duration, and book online right away.`,
    bookingTitle: "Book an appointment",
    bookingDescription:
      "Book online at RKM Barbershop. Choose your treatment, your barber and a time that suits you — you can see straight away which times are free.",
    manageTitle: "Your appointment",
    privacyTitle: "Privacy statement",
    privacyDescription: "How RKM Barbershop handles your personal data when you book an appointment.",
  },
  hero: {
    intro:
      "Craftsmanship in haircuts, fades and beard care. Take a seat, relax and leave the details to us. Booking your appointment online takes a minute.",
    seeAvailability: "See availability",
    location: (city) => `Barbershop in ${city}`,
    bestTitle: "Free times",
    bestSubtitle: "choose a day to see every time",
    bestEmpty: "There are no free slots online at the moment. Feel free to call us and we’ll find a time together.",
    bestNote: "Tap a time to book it right away.",
    dayFull: "This day is fully booked.",
    dayFullLink: "Get an email if a spot opens up",
  },
  about: {
    eyebrow: "About RKM Barbershop",
    titleLine: "Craftsmanship,",
    titleAccent: "never rushed.",
    paragraphs: [
      "RKM Barbershop is a place to unwind for a moment. We take the time to listen, give honest advice and pay attention to every detail — from the first cut to the last line with the razor.",
      "Whether you come for your regular cut, a sharp skin fade or a well-groomed beard: your appointment is fixed and you’re seen on time.",
    ],
    steps: [
      { title: "Talking it through", text: "Your wishes come first. Tell us what you have in mind or show us a photo, and we’ll make it happen." },
      { title: "Precision work", text: "Scissors, clippers and razor, with attention to every transition and every line." },
      { title: "A sharp finish", text: "Styling, so your look stays great at home too." },
    ],
  },
  barber: {
    eyebrowTeam: "The team",
    eyebrowSolo: "Your barber",
    meet: ["Meet", ""],
    team: (owner) => [
      `${owner} is the owner of RKM Barbershop. He has been cutting hair for twenty years and is a certified barber. From a classic gentleman’s cut to a sharp skin fade or a shaped beard: you’re in experienced hands.`,
      "You choose who you sit with. If you keep going to the same barber, you don’t have to explain how you like it every time.",
    ],
    solo: (owner) => [
      `At RKM Barbershop you’re always in the chair with ${owner}. He owns the shop, has been cutting hair for twenty years and is a certified barber. From a classic gentleman’s cut to a sharp skin fade or a shaped beard: you’re in experienced hands.`,
      `Because the same barber looks after you every time, you don’t have to explain how you like it again and again. ${owner} knows your style and thinks along with you, so it’s right every time.`,
    ],
    facts: [
      { value: "20 years", label: "of experience as a barber" },
      { value: "Certified", label: "barber" },
      { value: "Owner", label: "of the shop" },
    ],
    bookWith: (name) => `Book with ${name}`,
    ownerRole: "Owner & barber",
    alsoInTeam: "Also on the team",
    bookWithShort: (name) => `Book with ${name}`,
  },
  services: {
    eyebrow: "Our treatments",
    title: "From classic to razor-sharp",
    intro:
      "Choose your treatment and book a time that suits you right away. The time we need is genuinely reserved for you.",
    bookThis: "— book this treatment",
  },
  whyUs: {
    eyebrow: "Why RKM?",
    title: "The details make the difference",
    reasons: [
      { title: "Craftsmanship", text: "Twenty years of experience in fades, classic cuts and beard work, done to perfection." },
      {
        title: "Book or walk in",
        text: "With an appointment you’re in the chair at a fixed time. No appointment? Feel free to walk in: if there’s time, we’ll help you straight away.",
      },
      {
        title: "Personal advice",
        text: "We think along about your hair type, face shape and style. What you do with our advice is entirely up to you.",
      },
      { title: "Hygiene & quality", text: "Clean workstations, disinfected tools and caring products." },
    ],
  },
  availability: {
    eyebrow: "Availability",
    title: "When can you come in?",
    intro: (service) =>
      `Live from our calendar${service ? ` (${service})` : ""}. Pick a day to see the free times straight away.`,
    from: (time) => `from ${time}`,
    fullHint: "sign up to hear when a spot frees up",
    tipLabel: "Tip:",
    tip: (day, date) => `the most room is ${day}${date ? ` (${date})` : ""}.`,
    busy: "The coming days are busy. Feel free to call us and we’ll find a time together.",
    allTimes: "See all times",
  },
  prices: {
    eyebrow: "Prices",
    title: "Clear pricing",
    intro:
      "No surprises afterwards. All prices include VAT; the time listed for a treatment is reserved entirely for you.",
    bookNow: "Book now",
  },
  reviews: {
    eyebrow: "Reviews",
    title: "What customers say",
    allOnGoogle: "All reviews on Google",
    write: "Write a review",
    invite: "Been to see us? We’d love to hear what you thought.",
    stars: (rating) => `${rating} out of 5 stars`,
    example: "Example",
  },
  contact: {
    eyebrow: "Contact & location",
    title: "Come and see us",
    intro: "Booking online is quickest. Would you rather call or ask a question? Of course you can.",
    details: "Contact details",
    phone: "Phone",
    email: "Email",
    address: "Address",
    hours: "Opening hours",
    location: "Location",
    directions: "Get directions",
  },
  cta: {
    titleStart: "Ready for a",
    titleAccent: "fresh look?",
    text: "Choose your treatment, your barber and a time that suits you. Done in a minute.",
  },
  treatments: {
    eyebrow: "Treatments & prices",
    title: "Craftsmanship down to the details",
    intro:
      "With every treatment, your wishes come first. The time listed is reserved entirely for you. Choose a treatment to see the available times right away.",
    priceList: "Price list",
    vatIncluded: "All prices include VAT.",
  },
  booking: {
    eyebrow: "Book online",
    title: "Book an appointment",
    unavailable: (phone) =>
      `Online booking isn’t possible at the moment. Feel free to call us${phone ? ` on ${phone}` : ""}.`,
  },
};

const de: HomeMessages = {
  meta: {
    title: (business, place) => `${business} | Professioneller Barbershop${place}`,
    place: (city) => ` in ${city}`,
    description: (business, place) =>
      `${business}: professioneller Barbershop${place}. Haarschnitte, Skin Fades und Bartpflege mit echtem Handwerk. Buche deinen Termin ganz einfach online.`,
    keywords: (city) =>
      ["Barbershop", "Barber", "Herrenfriseur", "Skin Fade", "Bart trimmen", ...(city ? [`Barbershop ${city}`, `Friseur ${city}`] : [])],
    treatmentsTitle: "Leistungen & Preise",
    treatmentsDescription: (business, place) =>
      `Haarschnitt, Skin Fade, Bart trimmen und Hot Towel Shave bei ${business}${place}. Alle Leistungen mit Preis und Dauer — und direkt online buchen.`,
    bookingTitle: "Termin buchen",
    bookingDescription:
      "Buche online bei RKM Barbershop. Wähle deine Leistung, deinen Barber und einen passenden Zeitpunkt — du siehst sofort, welche Zeiten frei sind.",
    manageTitle: "Dein Termin",
    privacyTitle: "Datenschutzerklärung",
    privacyDescription: "Wie RKM Barbershop mit deinen personenbezogenen Daten umgeht, wenn du einen Termin buchst.",
  },
  hero: {
    intro:
      "Handwerk bei Haarschnitt, Fades und Bartpflege. Nimm Platz, entspann dich und überlass uns die Details. Deinen Termin buchst du in einer Minute online.",
    seeAvailability: "Verfügbarkeit ansehen",
    location: (city) => `Barbershop in ${city}`,
    bestTitle: "Freie Zeiten",
    bestSubtitle: "wähle einen Tag und sieh alle Zeiten",
    bestEmpty: "Online sind gerade keine Termine frei. Ruf uns gern an, dann finden wir gemeinsam einen.",
    bestNote: "Tippe auf eine Zeit, um direkt zu buchen.",
    dayFull: "Dieser Tag ist leider ausgebucht.",
    dayFullLink: "Benachrichtigung, wenn ein Platz frei wird",
  },
  about: {
    eyebrow: "Über RKM Barbershop",
    titleLine: "Handwerk,",
    titleAccent: "ohne Eile.",
    paragraphs: [
      "RKM Barbershop ist ein Ort, an dem du kurz zur Ruhe kommst. Wir nehmen uns Zeit zum Zuhören, beraten ehrlich und arbeiten mit Blick fürs Detail — vom ersten Schnitt bis zur letzten Linie mit dem Messer.",
      "Ob du für deinen regelmäßigen Haarschnitt kommst, für einen sauberen Skin Fade oder einen gepflegten Bart: Dein Termin steht fest und du bist pünktlich dran.",
    ],
    steps: [
      { title: "Kurz abstimmen", text: "Dein Wunsch steht im Mittelpunkt. Erzähl uns, was du dir vorstellst, oder zeig ein Foto — wir setzen es um." },
      { title: "Präzisionsarbeit", text: "Schere, Haarschneider und Messer, mit Liebe zu jedem Übergang und jeder Linie." },
      { title: "Sauber vollendet", text: "Styling, damit dein Look auch zu Hause sitzt." },
    ],
  },
  barber: {
    eyebrowTeam: "Das Team",
    eyebrowSolo: "Dein Barber",
    meet: ["Lerne", "kennen"],
    team: (owner) => [
      `${owner} ist der Inhaber von RKM Barbershop. Er schneidet seit zwanzig Jahren Haare und ist zertifizierter Barber. Vom klassischen Herrenschnitt bis zum sauberen Skin Fade oder einem Bart in Form: Du bist in erfahrenen Händen.`,
      "Du entscheidest selbst, bei wem du sitzt. Gehst du immer zum selben Barber, musst du nicht jedes Mal neu erklären, wie du es haben möchtest.",
    ],
    solo: (owner) => [
      `Bei RKM Barbershop sitzt du immer bei ${owner}. Er ist der Inhaber, schneidet seit zwanzig Jahren Haare und ist zertifizierter Barber. Vom klassischen Herrenschnitt bis zum sauberen Skin Fade oder einem Bart in Form: Du bist in erfahrenen Händen.`,
      `Weil dich immer derselbe Barber betreut, musst du nicht jedes Mal neu erklären, wie du es haben möchtest. ${owner} kennt deinen Stil und denkt mit, damit es jedes Mal passt.`,
    ],
    facts: [
      { value: "20 Jahre", label: "Erfahrung als Barber" },
      { value: "Zertifizierter", label: "Barber" },
      { value: "Inhaber", label: "des Ladens" },
    ],
    bookWith: (name) => `Termin bei ${name} buchen`,
    ownerRole: "Inhaber & Barber",
    alsoInTeam: "Außerdem im Team",
    bookWithShort: (name) => `Termin bei ${name}`,
  },
  services: {
    eyebrow: "Unsere Leistungen",
    title: "Von klassisch bis messerscharf",
    intro:
      "Wähle deine Leistung und buche direkt einen passenden Termin. Die Zeit, die wir brauchen, reservieren wir auch wirklich für dich.",
    bookThis: "— diese Leistung buchen",
  },
  whyUs: {
    eyebrow: "Warum RKM?",
    title: "Die Details machen den Unterschied",
    reasons: [
      { title: "Handwerk", text: "Zwanzig Jahre Erfahrung mit Fades, klassischen Schnitten und Bartarbeit, bis ins Detail gepflegt." },
      {
        title: "Mit Termin oder spontan",
        text: "Mit Termin sitzt du zu einer festen Zeit im Stuhl. Kein Termin? Komm gern vorbei: Wenn Zeit ist, bist du sofort dran.",
      },
      {
        title: "Persönliche Beratung",
        text: "Wir denken mit — bei Haartyp, Gesichtsform und Stil. Was du aus unserer Beratung machst, entscheidest du ganz allein.",
      },
      { title: "Hygiene & Qualität", text: "Saubere Arbeitsplätze, desinfizierte Werkzeuge und pflegende Produkte." },
    ],
  },
  availability: {
    eyebrow: "Verfügbarkeit",
    title: "Wann hast du Zeit?",
    intro: (service) =>
      `Live aus unserem Kalender${service ? ` (${service})` : ""}. Wähle einen Tag, um sofort die freien Zeiten zu sehen.`,
    from: (time) => `ab ${time}`,
    fullHint: "melde dich an, falls ein Termin frei wird",
    tipLabel: "Tipp:",
    tip: (day, date) => `am meisten frei ist es ${day}${date ? ` (${date})` : ""}.`,
    busy: "Die nächsten Tage sind voll. Ruf uns gern an, dann finden wir gemeinsam einen Termin.",
    allTimes: "Alle Zeiten ansehen",
  },
  prices: {
    eyebrow: "Preise",
    title: "Klare Preise",
    intro:
      "Keine Überraschungen hinterher. Alle Preise inklusive MwSt.; die angegebene Zeit einer Leistung ist komplett für dich reserviert.",
    bookNow: "Jetzt buchen",
  },
  reviews: {
    eyebrow: "Bewertungen",
    title: "Was Kunden sagen",
    allOnGoogle: "Alle Bewertungen auf Google",
    write: "Bewertung schreiben",
    invite: "Warst du schon bei uns? Wir freuen uns auf deine Meinung.",
    stars: (rating) => `${rating} von 5 Sternen`,
    example: "Beispiel",
  },
  contact: {
    eyebrow: "Kontakt & Anfahrt",
    title: "Komm vorbei",
    intro: "Online buchen geht am schnellsten. Lieber anrufen oder eine Frage stellen? Das geht natürlich auch.",
    details: "Kontaktdaten",
    phone: "Telefon",
    email: "E-Mail",
    address: "Adresse",
    hours: "Öffnungszeiten",
    location: "Standort",
    directions: "Route planen",
  },
  cta: {
    titleStart: "Bereit für einen",
    titleAccent: "frischen Look?",
    text: "Wähle deine Leistung, deinen Barber und einen passenden Zeitpunkt. In einer Minute erledigt.",
  },
  treatments: {
    eyebrow: "Leistungen & Preise",
    title: "Handwerk bis ins Detail",
    intro:
      "Bei jeder Leistung steht dein Wunsch im Mittelpunkt. Die angegebene Zeit ist komplett für dich reserviert. Wähle eine Leistung, um sofort die freien Zeiten zu sehen.",
    priceList: "Preisliste",
    vatIncluded: "Alle Preise inklusive MwSt.",
  },
  booking: {
    eyebrow: "Online buchen",
    title: "Termin buchen",
    unavailable: (phone) =>
      `Online buchen ist gerade nicht möglich. Ruf uns gern an${phone ? ` unter ${phone}` : ""}.`,
  },
};

export const home: Record<Locale, HomeMessages> = { nl, en, de };
