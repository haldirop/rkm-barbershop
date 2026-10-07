# Architectuur

## Mappen

```
src/
  app/
    (site)/               Publieke website (homepage, behandelingen, afspraak-maken, afspraak/[token], privacy)
    admin/
      login/              Inlogpagina
      (panel)/            Beheerpagina's (achter requireAdmin)
      actions/            Server actions van het beheer
    api/
      availability/       Publieke beschikbaarheid (dag, kalender, suggesties) — alleen tijden, geen klantdata
      afspraak/[token]/   Agenda-bestand (.ics) voor een bevestigde afspraak
      cron/herinneringen/ Herinneringen + automatisch afronden
    auth/bevestigen/      Links uit Supabase Auth-mails (wachtwoord herstellen)
    sitemap.ts, robots.ts, manifest.ts, opengraph-image.tsx, icon.svg
  components/
    ui/                   Basiscomponenten (knoppen, formulieren, dialoog, toast)
    site/                 Header, footer, homepage-secties
    booking/              Boekingswizard, kalender, tijdslots, selfservice
    admin/                Navigatie, agenda, formulieren
  emails/                 E-mailtemplates (layout + alle berichten)
  lib/                    Pure logica, ook bruikbaar in de browser
    availability.ts       Beschikbaarheidsmotor (zonder I/O, volledig getest)
    time.ts, format.ts    Datum/tijd in winkeltijd (Europe/Amsterdam), Nederlandse notatie
    validation.ts         Zod-schema's (client én server)
  server/                 Alleen server-side
    config.ts             Alle environment variables op één plek
    db/                   Schema, verbinding, seed
    auth/                 Supabase Auth, lokale login, beheerders-allowlist, rate limiting
    services/             Domeinlogica: boeken, afspraken, beschikbaarheid, klanten, statistieken, jobs
    notifications/        Mailprovider (Resend/console) en notificaties
  proxy.ts                Ververst de Supabase-sessie; stuurt bezoekers zonder sessie naar /admin/login
drizzle/                  SQL-migraties (structuur, dubbele-boekingen-constraint, RLS)
supabase/                 Supabase-instellingen en e-mailsjabloon voor wachtwoordherstel
scripts/                  setup, demo, create-admin
tests/                    Vitest (engine + integratie op in-memory PostgreSQL)
```

## Datamodel

| Tabel | Inhoud |
| --- | --- |
| `admin_users` | Wie in /admin mag (allowlist), gekoppeld aan Supabase Auth via `auth_user_id` |
| `sessions` | Alleen voor de lokale ontwikkel-login (SHA-256 van het token) |
| `customers` | Klanten; e-mail uniek (optioneel bij telefonische boekingen) |
| `barbers`, `barber_working_hours` | Barbers en werktijden per weekdag |
| `services` | Behandelingen met prijs (centen) en duur |
| `appointments` | Afspraken met status, datum, start/eind, en een kopie van naam/prijs/duur van dienst en barber |
| `appointment_events` | Geschiedenis per afspraak (aangemaakt, goedgekeurd, verplaatst, …) |
| `business_hours`, `breaks`, `blocked_times` | Openingstijden, vaste pauzes, eenmalige blokkades |
| `reviews` | Reviews op de homepage |
| `email_log` | Elke verstuurde/gelogde/mislukte e-mail |
| `settings` | Eén rij met bedrijfsgegevens en boekingsregels |
| `rate_limit_events` | Glijdend venster voor inlog- en boekingslimieten |

Datums en tijden staan in lokale winkeltijd (`date` + `time`); de zaak heeft één vestiging, dus dit voorkomt
zomertijdfouten. Weekdagen gebruiken ISO-nummering (1 = maandag).

## Afspraakstatussen

```
PENDING ──goedkeuren──▶ APPROVED ──na afloop──▶ COMPLETED
   │                       │
   ├──weigeren──▶ REJECTED │
   └──annuleren──▶ CANCELLED ◀──annuleren──┘
```

`PENDING` en `APPROVED` bezetten een tijdslot. Een nieuwe aanvraag houdt de plek dus vast tot de beheerder
beslist, zodat twee klanten niet hetzelfde moment kunnen aanvragen. Weigeren of annuleren maakt het slot direct
weer vrij. Verplaatst een klant een afspraak, dan gaat die terug naar `PENDING`.

## Dubbele boekingen

1. Alle boekingsmutaties lopen in een transactie met een advisory lock (`pg_advisory_xact_lock`).
2. Binnen die transactie wordt de beschikbaarheid opnieuw berekend met verse data.
3. Een exclusion constraint (`btree_gist`) weigert overlappende actieve afspraken per barber, ook als de
   applicatie ooit een fout zou maken. Zie `drizzle/0001_appointment_overlap.sql`.

De integratietest stuurt zes gelijktijdige aanvragen voor hetzelfde slot; er slaagt er precies één.

## Beschikbaarheid

`src/lib/availability.ts` werkt per dag:

1. Werktijd = openingstijden ∩ werktijden van de barber, min pauzes en blokkades.
2. Kandidaat-starttijden: het raster (standaard elke 15 min) plus het moment direct na een bestaande afspraak,
   zodat er geen onbruikbare gaten ontstaan.
3. Een start is geldig als de **volledige** duur binnen de werktijd past en (inclusief buffer) niet overlapt met
   een afspraak. Voorbeeld: bij een afspraak 12:00–12:45 wordt 12:15 voor een knipbeurt van 30 minuten nooit
   aangeboden.
4. Dagniveau: *ruim* (groen), *beperkt* (oranje, < 35 % van de capaciteit of ≤ 3 tijden), *vol* (rood) of
   *gesloten*.
5. "Beste beschikbaarheid": de langste aaneengesloten vrije perioden, met starttijden één behandeling uit elkaar —
   die plekken raken het minst snel vol.

Boekingsregels (minimale voorbereidingstijd, horizon, buffer, rasterinterval) staan in `settings` en zijn in
het beheer aan te passen.

## Inloggen beheer

Productie gebruikt **Supabase Auth**: wachtwoorden, sessies en wachtwoordherstel beheert Supabase.
Toegang tot /admin vereist daarnaast een rij in `admin_users` (allowlist):

1. `proxy.ts` ververst de sessie (`getClaims()`) en stuurt bezoekers zonder sessie naar de inlogpagina.
2. Elke beheerpagina, server action en route roept `requireAdmin()` aan: sessie geldig **én** `auth_user_id`
   staat in `admin_users`.
3. Bij de eerste login wordt een account gekoppeld op e-mailadres, maar alleen als Supabase het adres heeft
   bevestigd. `ADMIN_EMAIL` staat automatisch op de lijst (eigenaar).
4. Extra beheerders maakt het beheer aan met de secret key (`auth.admin.createUser`), alleen op de server.

Zonder `SUPABASE_URL` (lokale ontwikkeling, tests) valt de site terug op een ingebouwde login met Argon2id en
databasesessies, zodat het project zonder accounts draait. `tests/supabase-auth.test.ts` test de Supabase-route
met de echte supabase-js-bibliotheken tegen een nagebootste Auth-API.

## Database-beveiliging (Row Level Security)

Browsers praten nooit rechtstreeks met de database. Toch zet `drizzle/0002_row_level_security.sql` RLS aan op
elke tabel (zonder policies) en ontneemt het de Supabase-rollen `anon`/`authenticated` alle rechten, ook voor
toekomstige tabellen. De server verbindt als eigenaar van de tabellen en wordt daardoor niet beperkt.
`tests/security.test.ts` bootst de Supabase-rollen na en controleert dit.

## Notificaties

Server actions plannen e-mails met `after()`, zodat de klant niet wacht op de mailserver. `MailProvider` heeft
twee implementaties: **Resend** (HTTPS-API, één nieuwe poging bij tijdelijke fouten, Nederlandse foutuitleg) en
console (development, status `LOGGED`). Elke poging komt in `email_log` en is zichtbaar bij de afspraak.
Templates staan in `src/emails/`: tabellen en inline styles, zodat ze werken in Gmail, Outlook, Apple Mail en op
mobiel. Klantlinks worden met `APP_SECRET` ondertekend en kunnen daardoor in elke e-mail opnieuw worden
meegestuurd zonder geheim in de database.

**Herinneringen** gaan de dag vóór een bevestigde afspraak uit, vanaf een instelbaar tijdstip (standaard 17:00).
Vercel Cron roept `/api/cron/herinneringen` dagelijks aan (dat past in het gratis plan); vaker aanroepen mag ook.
Een herinnering wordt eerst geclaimd in de database en dan verstuurd, zodat er nooit twee uitgaan.

## Database-drivers

`DATABASE_URL` bepaalt de driver: `postgresql://…` (productie, node-postgres) of `pglite:…` (lokaal, ingebouwde
PostgreSQL in WebAssembly). Schema, migraties en queries zijn identiek, inclusief de exclusion constraint.
