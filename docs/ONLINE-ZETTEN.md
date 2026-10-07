# Zo zet je RKM Barbershop online

Deze handleiding neemt je stap voor stap mee. Je hebt geen programmeerkennis nodig.
Reken op ongeveer **anderhalf uur werk**, plus wachttijd voor je domein (meestal minder dan een uur,
soms tot een dag).

**Wat al klaar is:** de website, de database-structuur, de e-mails, de beveiliging en de configuratie
voor Vercel. **Wat jij doet:** accounts aanmaken, op een paar knoppen klikken en waarden kopiëren.

> 🔐 **Geheimen** (wachtwoorden, API keys) plak je alleen in Supabase, Resend, Vercel of in het bestand
> `.env.vercel` op je eigen computer. Nooit in een chat, e-mail of WhatsApp.

## Overzicht

| Stap | Wat | Waar je inlogt |
| --- | --- | --- |
| 1 | Code op GitHub zetten | github.com |
| 2 | Database + inloggen beheer | supabase.com |
| 3 | E-mail versturen | resend.com |
| 4 | Eigen domeinnaam | een domeinregistrar (bijv. TransIP of Vimexx) |
| 5 | Website online zetten | vercel.com |
| 6 | Instellingen invullen | vercel.com |
| 7 | Je beheerdersaccount | supabase.com |
| 8 | Alles testen | je eigen website |
| 9 | Live zetten | je eigen website |

Houd tijdens het volgen het bestand **`.env.vercel`** open in Kladblok
(`C:\Users\haldi\rkm-barbershop\.env.vercel`). Daar verzamel je onderweg alle waarden.
`APP_SECRET` en `CRON_SECRET` staan er al in.

---

## STAP 1 — GitHub

GitHub bewaart de code van je website. Vercel haalt de website daar vandaan.

1. Ga naar **https://github.com/signup** en maak een gratis account aan.
2. Klik rechtsboven op **+** → **New repository**.
3. Vul in:
   - **Repository name:** `rkm-barbershop`
   - Kies **Private** (alleen jij kunt de code zien).
   - Vink **niets** aan bij "Add a README" / ".gitignore" / "license".
4. Klik op **Create repository**.
5. Kopieer de link die GitHub toont, iets als `https://github.com/jouwnaam/rkm-barbershop.git`.
6. **Stuur die link naar Claude** (dit is niet geheim). Claude zet de code dan voor je op GitHub.
   Er opent een venster van GitHub waarin je één keer inlogt en op **Authorize** klikt.

   Liever zelf? Open een terminal in de projectmap en voer uit:

   ```bash
   git remote add origin https://github.com/jouwnaam/rkm-barbershop.git
   ```

   ```bash
   git push -u origin main
   ```

✅ Klaar als je op GitHub de mappen `src`, `docs` en `drizzle` ziet staan.

---

## STAP 2 — Supabase (database en inloggen)

1. Ga naar **https://supabase.com** → **Start your project** en maak een account aan.
   Gebruik bij voorkeur **hetzelfde e-mailadres** dat je straks als beheerder gebruikt.
2. Klik op **New project** en vul in:
   - **Name:** `rkm-barbershop`
   - **Database Password:** klik op **Generate a password**. Kopieer het en bewaar het veilig
     (bijv. in je wachtwoordmanager). Je hebt het zo nodig.
   - **Region:** **Central EU (Frankfurt)** (dichtbij, en je gegevens blijven in de EU).
   - Plan: **Free**.
3. Klik op **Create new project** en wacht een paar minuten.

**Database-adres (`DATABASE_URL`):**

4. Klik bovenaan op de knop **Connect**.
5. Kies bij **Method** (of "Connection type") voor **Transaction pooler**.
6. Kopieer de regel die begint met `postgresql://postgres.` en eindigt op `:6543/postgres`.
7. Plak hem in `.env.vercel` achter `DATABASE_URL=` en vervang `[YOUR-PASSWORD]` (inclusief de
   haakjes) door je databasewachtwoord uit stap 2.

**API-sleutels:**

8. Ga naar **Project Settings** (tandwiel linksonder) → **API Keys**.
9. Kopieer:
   - **Project URL** (bijv. `https://abcdefgh.supabase.co`) → `SUPABASE_URL=`
     (staat ook onder **Connect** of **Project Settings → Data API**)
   - **Publishable key** (begint met `sb_publishable_`) → `SUPABASE_PUBLISHABLE_KEY=`
   - **Secret key** (begint met `sb_secret_`; klik eerst op het oogje of op **Reveal**) → `SUPABASE_SECRET_KEY=`

   > Zie je alleen een **anon** en een **service_role** key? Gebruik dan anon voor
   > `SUPABASE_PUBLISHABLE_KEY` en service_role voor `SUPABASE_SECRET_KEY`. Beide werken.

**Veiligheidsinstellingen:**

10. **Authentication** → **Sign In / Providers** → zet **Allow new users to sign up** **uit** → **Save**.
    Zo kan niemand zelf een account aanmaken; beheerders voeg jij toe.

De tabellen hoef je niet zelf aan te maken: dat gebeurt automatisch bij stap 5.

✅ Klaar als `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` en `SUPABASE_SECRET_KEY`
in `.env.vercel` staan.

---

## STAP 3 — Resend (e-mail)

### Deel A — account en API key (nu)

1. Ga naar **https://resend.com** → **Get Started** en maak een gratis account aan.
2. Ga links naar **API Keys** → **Create API Key**.
   - **Name:** `rkm-barbershop`
   - **Permission:** **Sending access**
   - **Domain:** **All domains** (na deel B kun je dit beperken tot je domein)
3. Klik op **Add**. Kopieer de sleutel (begint met `re_`). **Hij wordt maar één keer getoond.**
4. Plak hem in `.env.vercel` achter `RESEND_API_KEY=`.

> **Testen vóór je domein klaar is:** zet tijdelijk
> `EMAIL_FROM=RKM Barbershop <onboarding@resend.dev>`. Dan kun je alleen mails sturen naar het
> e-mailadres waarmee je bij Resend bent ingelogd — handig om alles te proberen.

### Deel B — je domein verifiëren (na stap 4)

5. Ga in Resend naar **Domains** → **Add Domain**.
6. Vul je domein in, bijvoorbeeld `rkmbarbershop.nl`. Kies als regio **Ireland (eu-west-1)**.
7. Resend toont nu **3 of 4 DNS-records**. Laat dit scherm open en voeg ze toe bij je
   domeinregistrar (zie stap 4, "DNS-records toevoegen"). Het gaat om:

   | Type | Naam (host) | Waarde | Prioriteit |
   | --- | --- | --- | --- |
   | TXT | `resend._domainkey` | lange tekst die begint met `p=` (kopieer uit Resend) | – |
   | MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` (kopieer uit Resend) | 10 |
   | TXT | `send` | `v=spf1 include:amazonses.com ~all` | – |
   | TXT (aanbevolen) | `_dmarc` | `v=DMARC1; p=none;` | – |

   Neem de waarden altijd letterlijk over uit Resend; de tabel is ter illustratie.
   Je bestaande e-mail (bijv. info@ bij je registrar) blijft gewoon werken: deze records raken die niet.
8. Klik in Resend op **Verify DNS Records**. Meestal is het binnen 15 minuten groen
   (**Verified**); soms duurt het een paar uur.
9. Zet in `.env.vercel`: `EMAIL_FROM=RKM Barbershop <afspraken@rkmbarbershop.nl>` (met jouw domein).

---

## STAP 4 — Domein

### Waar koop je een domein?

Bij een Nederlandse registrar, bijvoorbeeld **TransIP**, **Vimexx**, **Antagonist** of **Mijndomein**.
Een `.nl`-domein kost meestal **€5 tot €15 per jaar**. Kies zelf; let op:

- **Verlengingsprijs:** het eerste jaar is vaak goedkoop; kijk wat jaar 2 kost.
- **Je kunt zelf DNS-records aanpassen** (bij de genoemde partijen kan dat).
- **Geen onnodige pakketten:** je hebt geen hosting of websitebouwer nodig, alleen de domeinnaam.
  Een e-mailadres (zoals info@) bij je registrar is wel handig, maar optioneel.
- **Op naam van jezelf of je bedrijf**, met automatisch verlengen aan.

Kijk eerst of je naam vrij is, bijvoorbeeld via **https://www.sidn.nl** (zoek een domeinnaam) of
direct bij de registrar. `rkmbarbershop.nl` bezet? Probeer bijvoorbeeld `rkm-barbershop.nl` of
`rkmbarbershop.com`.

### DNS-records toevoegen (algemeen)

Bij elke registrar heet het ongeveer zo: **Domeinen → jouw domein → DNS** (of "DNS-beheer" /
"DNS-instellingen"). Per record vul je **Type**, **Naam** en **Waarde** in. Bij **Naam** vul je alleen
het deel vóór je domein in (dus `send`, niet `send.rkmbarbershop.nl`). Gebruik `@` voor het
domein zelf. TTL mag op de standaardwaarde blijven.

Je voegt records toe voor **Resend** (stap 3B) en voor **Vercel** (stap 5).

---

## STAP 5 — Vercel (de website online)

1. Ga naar **https://vercel.com/signup** en kies **Continue with GitHub**.
   Geef Vercel toegang tot je repository `rkm-barbershop`.
2. Klik op **Add New…** → **Project** → kies `rkm-barbershop` → **Import**.
3. Laat alle instellingen staan zoals ze zijn (alles is al geconfigureerd in `vercel.json`).
4. Open **Environment Variables** en doe stap 6 hieronder **voordat** je op Deploy klikt.
5. Klik op **Deploy**. Na 2–4 minuten krijg je een adres zoals `rkm-barbershop.vercel.app`.
   Tijdens de deploy worden ook automatisch alle databasetabellen aangemaakt.

### Je eigen domein koppelen

6. In Vercel: open je project → **Settings** → **Domains** → **Add Domain**.
7. Vul `www.rkmbarbershop.nl` in (met jouw domein) en klik op **Add**. Laat Vercel ook het
   domein zonder www toevoegen en doorsturen.
8. Vercel toont nu welke records nodig zijn. Meestal:

   | Type | Naam | Waarde |
   | --- | --- | --- |
   | A | `@` | `76.76.21.21` (of de waarde die Vercel toont) |
   | CNAME | `www` | de waarde die Vercel toont, bijv. `xxxx.vercel-dns-017.com` |

9. Voeg ze toe bij je registrar (stap 4). Bestaat er al een A-record voor `@` of een record voor
   `www`? Vervang dat dan (anders gaat het mis).
10. Wacht tot Vercel bij beide domeinen **Valid Configuration** toont.
    **HTTPS (het slotje) regelt Vercel automatisch** zodra de DNS klopt; je hoeft niets te kopen.
11. Zet in Vercel bij Environment Variables `SITE_URL` op `https://www.rkmbarbershop.nl`
    en kies daarna bij **Deployments** → laatste deploy → **⋯** → **Redeploy**.

---

## STAP 6 — Environment Variables

Dit zijn de instellingen van je website. Ze staan in `.env.vercel`.

1. Controleer dat alles in `.env.vercel` is ingevuld:

   | Variabele | Waar vandaan |
   | --- | --- |
   | `SITE_URL` | je domein, bijv. `https://www.rkmbarbershop.nl` (tijdelijk mag ook het `vercel.app`-adres) |
   | `APP_SECRET` | al ingevuld — nooit meer wijzigen |
   | `CRON_SECRET` | al ingevuld |
   | `DATABASE_URL` | Supabase → **Connect** → Transaction pooler (stap 2) |
   | `SUPABASE_URL` | Supabase → **Project Settings → API Keys** / **Connect** |
   | `SUPABASE_PUBLISHABLE_KEY` | Supabase → **Project Settings → API Keys** |
   | `SUPABASE_SECRET_KEY` | Supabase → **Project Settings → API Keys** |
   | `ADMIN_EMAIL` | jouw e-mailadres (wordt beheerder en krijgt meldingen van nieuwe aanvragen) |
   | `RESEND_API_KEY` | Resend → **API Keys** (stap 3) |
   | `EMAIL_FROM` | `RKM Barbershop <afspraken@jouwdomein.nl>` |

2. Selecteer in Kladblok alles (**Ctrl+A**), kopieer (**Ctrl+C**).
3. In Vercel: project → **Settings** → **Environment Variables**. Klik in het veld **Key** en plak
   (**Ctrl+V**). Vercel maakt er automatisch losse variabelen van.
4. Laat **Environments** op *Production, Preview en Development* staan → **Save**.
5. Heb je iets gewijzigd nadat de site al online stond? Dan **Redeploy** (zie stap 5.11).

---

## STAP 7 — Admin-account

1. In Supabase: **Authentication** → **Users** → **Add user** → **Create new user**.
2. Vul in:
   - **Email:** precies hetzelfde adres als `ADMIN_EMAIL`
   - **Password:** een sterk wachtwoord (minimaal 10 tekens, letters en cijfers)
   - Vink **Auto Confirm User** aan
3. Klik op **Create user**.
4. Ga naar **https://www.jouwdomein.nl/admin/login** en log in. Je ziet nu het dashboard.

**Extra beheerders** voeg je later toe in het beheer zelf: **Instellingen → Beheerders**
(naam, e-mail en een tijdelijk wachtwoord). Zij wijzigen dat na het inloggen bij Instellingen.

**Wachtwoord vergeten?** Klik op de inlogpagina op *Wachtwoord vergeten?*. Zodat dit ook goed
werkt voor extra beheerders, stel je in Supabase twee dingen in (5 minuten):

- **Authentication → URL Configuration:** Site URL = `https://www.jouwdomein.nl`, en bij
  Redirect URLs `https://www.jouwdomein.nl/auth/bevestigen` toevoegen.
- **Authentication → SMTP Settings:** e-mail via Resend (waarden staan in
  [`supabase/README.md`](../supabase/README.md)).

---

## STAP 8 — Testen

Doe dit één keer helemaal door, het liefst op je telefoon:

- [ ] **Homepage** opent via `https://www.jouwdomein.nl` met het slotje in de adresbalk.
- [ ] **Afspraak aanvragen** met je eigen e-mailadres. Je krijgt de mail *"Je afspraakaanvraag is ontvangen"*.
- [ ] **Melding voor de zaak:** op `ADMIN_EMAIL` komt *"Nieuwe afspraakaanvraag"* binnen.
- [ ] **Goedkeuren** in het beheer → je krijgt *"Je afspraak bij RKM Barbershop is bevestigd"*,
      met een knop om hem in je agenda te zetten.
- [ ] Nog een afspraak aanvragen en **weigeren** → je krijgt de afwijzingsmail; het tijdslot is weer vrij.
- [ ] In een mail op **Afspraak bekijken of wijzigen** klikken en de afspraak **verplaatsen** of **annuleren**.
- [ ] **Hetzelfde tijdslot twee keer** proberen te boeken (bijv. op twee telefoons): de tweede krijgt
      een nette melding dat het tijdstip bezet is.
- [ ] **Instellingen → E-mail → Testmail versturen** werkt.
- [ ] **Openingstijden** aanpassen en een **blokkade** toevoegen → op de site verdwijnen die tijden.
- [ ] **Herinnering:** keur een afspraak voor morgen goed; tussen 18:00 en 20:00 komt de herinnering binnen.
- [ ] **Uitloggen** en **Wachtwoord vergeten** proberen.

Gaat er een mail niet goed? Bij elke afspraak in het beheer staat onderaan **Verzonden e-mails**, met
de reden als iets mislukte.

---

## STAP 9 — Live zetten

- [ ] **Instellingen → Bedrijfsgegevens:** echt adres, telefoon en e-mail invullen en opslaan
      (deze komen op de site, in e-mails en bij Google).
- [ ] **Diensten** en **prijzen** controleren; **barbers** en hun werktijden instellen.
- [ ] **Openingstijden** en vaste **pauzes** controleren.
- [ ] **Testafspraken** van stap 8 verwijderen (Afspraken → afspraak → Verwijderen).
- [ ] Op het dashboard staan alle punten van **Klaar voor livegang?** op groen.
- [ ] (Aanbevolen) Je website aanmelden bij **Google Search Console** en een **Google Bedrijfsprofiel**
      maken met een link naar je site — belangrijk om lokaal gevonden te worden.
- [ ] Deel je link! 🎉

---

## Wat kost het?

| Onderdeel | Aanbevolen | Gratis optie | Wanneer betalen | Reken op |
| --- | --- | --- | --- | --- |
| **Domein** | TransIP, Vimexx of vergelijkbaar | nee | per jaar | ± €5–15 per jaar |
| **Hosting** | Vercel | Hobby-plan (gratis) | Vercel staat Hobby officieel alleen toe voor **niet-commercieel** gebruik. Voor een bedrijfswebsite vraagt Vercel het **Pro**-plan. | Pro: $20 per maand |
| **Database + inloggen** | Supabase | Free-plan: 500 MB, ruim genoeg voor jaren aan afspraken | Een gratis project wordt na een week **zonder activiteit** gepauzeerd. De dagelijkse herinneringstaak houdt het actief, maar zekerheid heb je pas met Pro. | Free; Pro $25 per maand |
| **E-mail** | Resend | Free: 3.000 per maand, **maximaal 100 per dag** | Pas bij meer dan ±100 mails per dag (±25 afspraken per dag) | Free; Pro $20 per maand |

**Goedkoopst om mee te starten:** domein (± €10/jaar) + alles gratis — prima om te testen en
om de eerste weken te draaien. **Netjes en zorgeloos voor een bedrijf:** domein + Vercel Pro
(± €19/maand); Supabase en Resend kunnen voor een kleine barbershop meestal gratis blijven.

---

## Hoe werken de herinneringen?

Elke dag rond **19:00** (in de wintertijd rond 18:00) roept Vercel automatisch de website aan
(`/api/cron/herinneringen`, beveiligd met `CRON_SECRET`). Die stuurt een herinnering naar iedereen
met een **bevestigde** afspraak op de volgende dag, en zet afspraken van eerder die dag op *Afgerond*.
Het tijdstip en aan/uit stel je in bij **Instellingen → Boekingsregels**.

---

## Problemen oplossen

| Probleem | Oplossing |
| --- | --- |
| Deploy mislukt met "Database-setup mislukt" | `DATABASE_URL` klopt niet. Controleer of je de **Transaction pooler**-link gebruikt (poort `6543`) en `[YOUR-PASSWORD]` hebt vervangen. Daarna **Redeploy**. |
| Inloggen geeft "Dit account heeft geen toegang" | Het e-mailadres van de Supabase-gebruiker is niet gelijk aan `ADMIN_EMAIL`, of de gebruiker is niet bevestigd (vink *Auto Confirm User* aan). |
| Inloggen geeft "Onjuist e-mailadres of wachtwoord" | Wachtwoord opnieuw instellen in Supabase: **Authentication → Users → ⋯ → Send password recovery**, of via *Wachtwoord vergeten?*. |
| Er komen geen e-mails aan | **Instellingen → E-mail → Testmail versturen** geeft de reden. Vaak: domein nog niet *Verified* in Resend, of `EMAIL_FROM` gebruikt een ander domein. Kijk ook in je spammap. |
| "Resend staat nog in testmodus" | Je gebruikt `onboarding@resend.dev`; dan kan alleen naar je eigen Resend-adres. Verifieer je domein (stap 3B). |
| Domein geeft "Invalid Configuration" in Vercel | Controleer de A- en CNAME-records; verwijder oude records voor `@` en `www`. DNS kan tot een paar uur duren. |
| Herstellink werkt niet ("verlopen of al gebruikt") | Vraag een nieuwe aan en open hem in dezelfde browser, of plak het e-mailsjabloon uit `supabase/templates` in Supabase (dan werkt hij overal). |
| Website toont "even niet bereikbaar" | Supabase-project gepauzeerd (gratis plan): open het project in Supabase en klik op **Restore**. |
