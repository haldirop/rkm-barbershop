import type { Metadata } from "next";
import { LocalBusinessJsonLd } from "@/components/site/json-ld";
import { CtaBand } from "@/components/site/sections/cta-band";
import { PriceList } from "@/components/site/sections/prices";
import { ServiceCard } from "@/components/site/sections/services";
import { home } from "@/i18n/messages/home";
import { alternatesFor } from "@/i18n/seo";
import { pageLocale } from "@/i18n/server";
import { getSiteData } from "@/server/services/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/behandelingen">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const { settings } = await getSiteData(locale);
  const t = home[locale].meta;
  const place = settings.city ? t.place(settings.city) : "";
  return {
    title: t.treatmentsTitle,
    description: t.treatmentsDescription(settings.businessName, place),
    alternates: alternatesFor("/behandelingen", locale),
  };
}

export default async function TreatmentsPage({ params }: PageProps<"/[locale]/behandelingen">) {
  const locale = await pageLocale(params);
  const site = await getSiteData(locale);
  const t = home[locale].treatments;
  return (
    <>
      <LocalBusinessJsonLd site={site} />
      <div className="container-page pt-32 pb-20 sm:pt-40">
        <header className="max-w-2xl">
          <p className="eyebrow flex items-center gap-3">
            <span className="gold-rule" aria-hidden />
            {t.eyebrow}
          </p>
          <h1 className="heading-display mt-4 text-5xl sm:text-6xl">{t.title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">{t.intro}</p>
        </header>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {site.services.map((service, i) => (
            <ServiceCard key={service.id} service={service} index={i} locale={locale} />
          ))}
        </ul>

        <section aria-labelledby="prijslijst" className="mt-24 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="prijslijst" className="heading-display text-4xl">
              {t.priceList}
            </h2>
            <p className="mt-4 text-ink-muted">{t.vatIncluded}</p>
          </div>
          <PriceList services={site.services} locale={locale} />
        </section>
      </div>
      <CtaBand locale={locale} />
    </>
  );
}
