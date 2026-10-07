import type { Metadata } from "next";
import { formatAddress } from "@/server/services/settings";
import { getSiteData } from "@/server/services/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacyverklaring",
  description: "Hoe RKM Barbershop omgaat met je persoonsgegevens bij het maken van een afspraak.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const { settings } = await getSiteData();
  const contact = [settings.email, settings.phone].filter(Boolean).join(" of ");
  return (
    <article className="container-page max-w-3xl pt-32 pb-24 sm:pt-40">
      <p className="eyebrow flex items-center gap-3">
        <span className="gold-rule" aria-hidden />
        Privacy
      </p>
      <h1 className="heading-display mt-4 text-5xl">Privacyverklaring</h1>
      <div className="mt-10 space-y-8 leading-relaxed text-ink-muted [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">
        <section>
          <h2>Wie zijn wij</h2>
          <p>
            {settings.businessName}
            {formatAddress(settings) ? `, ${formatAddress(settings)}` : ""}
            {settings.kvkNumber ? ` (KvK ${settings.kvkNumber})` : ""} is verantwoordelijk voor de verwerking van je
            persoonsgegevens zoals beschreven in deze verklaring.
          </p>
        </section>
        <section>
          <h2>Welke gegevens we verwerken</h2>
          <ul>
            <li>Voor- en achternaam, telefoonnummer en e-mailadres</li>
            <li>Gegevens over je afspraak: behandeling, barber, datum, tijd en eventuele opmerkingen</li>
          </ul>
        </section>
        <section>
          <h2>Waarom</h2>
          <p>
            We gebruiken deze gegevens uitsluitend om je afspraak te plannen, te bevestigen, je eraan te herinneren en
            contact met je op te nemen als er iets verandert. De grondslag is de uitvoering van de overeenkomst
            (je afspraak). We gebruiken je gegevens niet voor marketing en verkopen ze nooit aan derden.
          </p>
        </section>
        <section>
          <h2>Hoe lang we gegevens bewaren</h2>
          <p>
            We bewaren je gegevens zolang je klant bij ons bent en verwijderen ze op verzoek. Gegevens die we wettelijk
            moeten bewaren (zoals voor de belastingdienst) bewaren we zo lang als de wet voorschrijft.
          </p>
        </section>
        <section>
          <h2>Delen met anderen</h2>
          <p>
            Voor het hosten van de website en het versturen van e-mails schakelen we zorgvuldig gekozen dienstverleners
            in. Met hen zijn afspraken gemaakt over de beveiliging van je gegevens.
          </p>
        </section>
        <section>
          <h2>Cookies</h2>
          <p>
            Deze website gebruikt geen tracking- of advertentiecookies. Als je ‘gegevens onthouden’ aanvinkt bij het
            boeken, worden je naam en contactgegevens alleen lokaal in je eigen browser opgeslagen.
          </p>
        </section>
        <section>
          <h2>Jouw rechten</h2>
          <p>
            Je hebt het recht om je gegevens in te zien, te laten corrigeren of te laten verwijderen. Neem hiervoor
            contact met ons op{contact ? ` via ${contact}` : ""}. Ben je niet tevreden over hoe we met je gegevens
            omgaan, dan kun je een klacht indienen bij de Autoriteit Persoonsgegevens.
          </p>
        </section>
      </div>
    </article>
  );
}
