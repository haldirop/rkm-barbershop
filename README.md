# RKM Barbershop

Website met online afspraaksysteem en beheerdashboard voor RKM Barbershop.

**Online zetten?** Volg de stap-voor-stap handleiding: **[docs/ONLINE-ZETTEN.md](docs/ONLINE-ZETTEN.md)**.

## Wat het doet

- **Website** — homepage, behandelingen & prijzen, live beschikbaarheid, contact, privacyverklaring. Responsive en geoptimaliseerd voor Google (lokale SEO, structured data, sitemap).
- **Afspraak aanvragen** — behandeling → barber → datum & tijd → gegevens → bevestigen. Een aanvraag krijgt status `PENDING`; pas na goedkeuring is hij definitief.
- **Slimme beschikbaarheid** — alleen tijden waarin de hele behandeling past (incl. buffer, pauzes, blokkades en werktijden per barber), dagkleuren groen/oranje/rood en "Beste beschikbaarheid".
- **Klant-selfservice** — beveiligde link om de afspraak te bekijken, te verplaatsen, te annuleren of in de agenda te zetten.
- **Beheer (`/admin`)** — aanvragen goedkeuren/weigeren, agenda (dag/week/maand), klanten, diensten, barbers, openingstijden/pauzes/blokkades, reviews, instellingen en beheerders.
- **E-mails** — aanvraag ontvangen, bevestigd, geweigerd, geannuleerd, verplaatst, herinnering (dag van tevoren) en een melding voor de zaak bij elke nieuwe aanvraag.

## Technologie

| Onderdeel | Gebruikt |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Database | PostgreSQL bij **Supabase**, via Drizzle ORM (lokaal: ingebouwde PGlite) |
| Inloggen beheer | **Supabase Auth** (lokaal zonder Supabase: ingebouwde login met Argon2id) |
| E-mail | **Resend** (lokaal: e-mails worden in de terminal getoond) |
| Hosting | **Vercel** (inclusief dagelijkse taak voor herinneringen) |
| Tests | Vitest — beschikbaarheid, dubbele boekingen, login, RLS, e-mail |

## Projectstructuur

```
src/
  app/            Pagina's en API (publieke site, /admin, /api, /auth)
    admin/actions/  Server actions van het beheer
  components/     UI-componenten (ui, site, booking, admin)
  emails/         E-mailtemplates (HTML + platte tekst)
  lib/            Pure logica: beschikbaarheid, tijd, validatie, opmaak
  server/         Alleen server: database, auth, services, notificaties, config
  proxy.ts        Sessiecontrole vóór /admin
drizzle/          SQL-migraties (worden automatisch toegepast)
supabase/         Supabase-instellingen en het e-mailsjabloon voor wachtwoordherstel
scripts/          setup, demodata, beheerder aanmaken
tests/            Automatische tests
docs/             Handleiding online zetten + architectuur
```

## Installatie (lokaal)

Vereist: Node.js 20.9 of nieuwer. Lokaal heb je **geen** accounts nodig: de site gebruikt dan een
ingebouwde database, een ingebouwde login en toont e-mails in de terminal.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Vul in `.env.local` minimaal `APP_SECRET`, `ADMIN_EMAIL` en `ADMIN_PASSWORD` in en start:

```bash
npm run dev
```

- Website: http://localhost:3000
- Beheer: http://localhost:3000/admin

Voorbeeldafspraken om mee te oefenen (stop eerst `npm run dev`):

```bash
npm run db:demo
```

Demodata heeft overal het label **Demo** en verwijder je met één klik via *Beheer → Instellingen*.

## Environment variables

Alle variabelen staan met uitleg in [`.env.example`](.env.example). Waar je elke waarde vindt, staat
in [docs/ONLINE-ZETTEN.md](docs/ONLINE-ZETTEN.md#stap-6--environment-variables).

| Variabele | Nodig voor |
| --- | --- |
| `SITE_URL` | Links in e-mails, SEO |
| `APP_SECRET` | Ondertekenen van klantlinks (min. 32 tekens, nooit wijzigen) |
| `DATABASE_URL` | Database (Supabase: *Transaction pooler*, poort 6543) |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Inloggen beheer |
| `SUPABASE_SECRET_KEY` | Beheerders toevoegen vanuit het beheer (alleen server) |
| `ADMIN_EMAIL` | Eerste beheerder + meldingen van nieuwe aanvragen |
| `RESEND_API_KEY`, `EMAIL_FROM` | E-mails versturen |
| `CRON_SECRET` | Beveiliging van de herinneringstaak |

Oudere Supabase-namen (`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) werken ook.
Geen enkele geheime waarde komt in de code of in de browser terecht; alles wordt op de server gelezen.

## Supabase

- De **tabellen** worden automatisch aangemaakt bij elke deploy (`npm run vercel-build` →
  `scripts/setup.ts`). Handmatig kan ook: `npm run db:setup` met `DATABASE_URL` ingesteld.
- **Row Level Security** staat aan op alle tabellen; de publieke API-rollen hebben geen rechten.
  Zie [supabase/README.md](supabase/README.md).
- **Dubbele boekingen** zijn onmogelijk: controle in een vergrendelde transactie én een
  database-constraint (`btree_gist`).
- **Beheerders**: inloggen gaat via Supabase Auth, toegang via de tabel `admin_users`
  (`ADMIN_EMAIL` staat er automatisch in).

## Resend

Zie [docs/ONLINE-ZETTEN.md — stap 3](docs/ONLINE-ZETTEN.md#stap-3--resend-e-mail). Kort: account,
API key (`RESEND_API_KEY`), domein toevoegen + DNS-records, `EMAIL_FROM` op dat domein.
Elke verzonden of mislukte e-mail is terug te zien bij de afspraak in het beheer.

## Development

| Script | Doel |
| --- | --- |
| `npm run dev` | Ontwikkelserver (draait eerst `db:setup`) |
| `npm test` | Alle tests |
| `npm run typecheck` / `npm run lint` | Controles |
| `ENV_FILE=.env.vercel npm run db:setup` | Hetzelfde, maar alleen met de waarden uit `.env.vercel` (de productiedatabase) |
| `npm run db:generate` | Nieuwe migratie na een wijziging in `src/server/db/schema.ts` |
| `npm run db:demo` | Demodata toevoegen (`-- --remove` om te verwijderen) |
| `npm run admin:create -- e-mail "Naam"` | Beheerder aanmaken of wachtwoord resetten (toont een tijdelijk wachtwoord) |

Lokaal de Supabase-login testen zonder account: start `npx tsx tests/support/run-fake-supabase.ts`
en daarna de site met `SUPABASE_URL=http://127.0.0.1:54399`, `SUPABASE_PUBLISHABLE_KEY=sb_publishable_test`
en `SUPABASE_SECRET_KEY=sb_secret_test`.

## Production deployment

Vercel leest alles uit [`vercel.json`](vercel.json):

- **Build:** `npm run vercel-build` — past eerst de database-migraties toe en bouwt daarna de site.
- **Regio:** Dublin (`dub1`), dicht bij het Supabase-project in West EU (Ireland, `eu-west-1`). Verhuist de database naar een andere regio, pas dan `regions` in `vercel.json` aan (bijv. `fra1` voor Frankfurt).
- **Cron:** dagelijks om 17:00 UTC `/api/cron/herinneringen` (herinneringen + afspraken afronden).
  Vercel stuurt daarbij automatisch `Authorization: Bearer <CRON_SECRET>` mee.

Volledige stappen: [docs/ONLINE-ZETTEN.md](docs/ONLINE-ZETTEN.md).

## Admin setup

1. Zet je e-mailadres in `ADMIN_EMAIL`.
2. Maak in Supabase (**Authentication → Users → Add user**) een gebruiker met dat adres aan
   (*Auto Confirm User* aanvinken).
3. Log in op `/admin/login`. Extra beheerders voeg je toe via **Instellingen → Beheerders**.

## Troubleshooting

Zie de tabel onderaan [docs/ONLINE-ZETTEN.md](docs/ONLINE-ZETTEN.md#problemen-oplossen). Nog een paar
voor ontwikkelaars:

- **`npm run db:demo` hangt of geeft een fout** — stop eerst `npm run dev`: de lokale database
  (PGlite) staat maar één proces tegelijk toe.
- **Lokaal opnieuw beginnen** — verwijder de map `.data` en start `npm run dev`.
- **Database-certificaat controleren** — zet het Supabase-rootcertificaat in `DATABASE_CA_CERT`
  (standaard is de verbinding versleuteld maar wordt het certificaat niet gecontroleerd).
