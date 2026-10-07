import type { Metadata } from "next";
import { LocalBusinessJsonLd } from "@/components/site/json-ld";
import { CtaBand } from "@/components/site/sections/cta-band";
import { PriceList } from "@/components/site/sections/prices";
import { ServiceCard } from "@/components/site/sections/services";
import { getSiteData } from "@/server/services/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getSiteData();
  const place = settings.city ? ` in ${settings.city}` : "";
  return {
    title: "Behandelingen & prijzen",
    description: `Knippen, skin fade, baard trimmen en hot towel shave bij ${settings.businessName}${place}. Bekijk alle behandelingen, prijzen en duur, en boek direct online.`,
    alternates: { canonical: "/behandelingen" },
  };
}

export default async function TreatmentsPage() {
  const site = await getSiteData();
  return (
    <>
      <LocalBusinessJsonLd site={site} />
      <div className="container-page pt-32 pb-20 sm:pt-40">
        <header className="max-w-2xl">
          <p className="eyebrow flex items-center gap-3">
            <span className="gold-rule" aria-hidden />
            Behandelingen & prijzen
          </p>
          <h1 className="heading-display mt-4 text-5xl sm:text-6xl">Vakwerk, tot in de details</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            Elke behandeling begint met een kort gesprek over wat je wilt en wat bij je past. De tijd die erbij
            staat, is volledig voor jou gereserveerd. Kies een behandeling om direct de beschikbare tijden te zien.
          </p>
        </header>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {site.services.map((service, i) => (
            <ServiceCard key={service.id} service={service} index={i} />
          ))}
        </ul>

        <section aria-labelledby="prijslijst" className="mt-24 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="prijslijst" className="heading-display text-4xl">
              Prijslijst
            </h2>
            <p className="mt-4 text-ink-muted">Alle prijzen zijn inclusief btw.</p>
          </div>
          <PriceList services={site.services} />
        </section>
      </div>
      <CtaBand />
    </>
  );
}
