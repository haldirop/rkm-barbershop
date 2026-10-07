# Supabase

RKM Barbershop gebruikt Supabase voor twee dingen:

1. **De database (PostgreSQL).** De website praat rechtstreeks met de database via `DATABASE_URL`.
   De tabellen worden **automatisch** aangemaakt en bijgewerkt bij elke deploy op Vercel
   (`npm run vercel-build` → `scripts/setup.ts`). Je hoeft dus geen SQL te plakken.
   De SQL-bestanden staan in [`/drizzle`](../drizzle) — voor wie wil zien wat er gebeurt.
2. **Inloggen voor beheerders (Supabase Auth).** Alleen mensen die in de tabel `admin_users`
   staan, komen in `/admin`. Het e-mailadres uit `ADMIN_EMAIL` staat daar automatisch in.

## Beveiliging (Row Level Security)

Bezoekers van de website praten nooit rechtstreeks met Supabase: alles gaat via de server.
Toch zet migratie [`0002_row_level_security.sql`](../drizzle/0002_row_level_security.sql)
Row Level Security aan op **elke** tabel en ontneemt de publieke rollen (`anon`, `authenticated`)
alle rechten. Wie de publishable key in handen krijgt, kan daarmee dus niets lezen of wijzigen.
Dit wordt getest in [`tests/security.test.ts`](../tests/security.test.ts).

In het Supabase-dashboard zie je bij elke tabel daarom het label **RLS enabled** zonder policies.
Dat is zo bedoeld.

## Aanbevolen instellingen in het dashboard

| Waar | Wat |
| --- | --- |
| Authentication → Sign In / Providers | **Allow new users to sign up: uit.** Beheerders voeg je zelf toe. |
| Authentication → URL Configuration | **Site URL**: `https://www.jouwdomein.nl` · **Redirect URLs**: `https://www.jouwdomein.nl/auth/bevestigen` |
| Authentication → SMTP Settings | Custom SMTP via Resend, zodat ook extra beheerders een herstelmail krijgen (zie hieronder). |
| Authentication → Emails → Reset Password | Optioneel: plak [`templates/wachtwoord-herstellen.html`](templates/wachtwoord-herstellen.html). Dan werkt de herstellink ook als je hem op een ander apparaat opent. |

### Custom SMTP met Resend

Zonder eigen SMTP verstuurt Supabase alleen mails naar leden van je Supabase-project, en maximaal
2 per uur. Vul bij **Authentication → SMTP Settings** in:

| Veld | Waarde |
| --- | --- |
| Sender email | `afspraken@jouwdomein.nl` (een adres op je geverifieerde Resend-domein) |
| Sender name | `RKM Barbershop` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | je Resend API key (dezelfde als `RESEND_API_KEY`) |

### Onderwerp en tekst van de herstelmail

Bij **Authentication → Emails → Reset Password**:

- Subject: `Kies een nieuw wachtwoord voor het beheer van RKM Barbershop`
- Body: de inhoud van [`templates/wachtwoord-herstellen.html`](templates/wachtwoord-herstellen.html)
