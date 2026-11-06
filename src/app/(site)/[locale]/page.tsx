import { LocalBusinessJsonLd } from "@/components/site/json-ld";
import { About } from "@/components/site/sections/about";
import { AvailabilityOverview } from "@/components/site/sections/availability";
import { Barber } from "@/components/site/sections/barber";
import { Contact } from "@/components/site/sections/contact";
import { CtaBand } from "@/components/site/sections/cta-band";
import { Hero } from "@/components/site/sections/hero";
import { Prices } from "@/components/site/sections/prices";
import { Reviews } from "@/components/site/sections/reviews";
import { Services } from "@/components/site/sections/services";
import { WhyUs } from "@/components/site/sections/why-us";
import { pageLocale } from "@/i18n/server";
import { addDays } from "@/lib/time";
import { getCalendar, getUpcomingDays } from "@/server/services/availability";
import { getSiteData } from "@/server/services/site";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await pageLocale(params);
  const site = await getSiteData(locale);
  const featured = site.services[0] ?? null;
  const query = { durationMinutes: featured?.durationMinutes ?? 30, barberId: null, now: site.now };
  const [upcoming, days] = await Promise.all([
    getUpcomingDays({ ...query, count: 7 }),
    getCalendar(site.now.date, addDays(site.now.date, 13), query),
  ]);
  const featuredRef = featured ? { id: featured.id, name: featured.name } : null;

  return (
    <>
      <LocalBusinessJsonLd site={site} />
      <Hero
        locale={locale}
        city={site.settings.city}
        tagline={site.tagline}
        status={site.status}
        today={site.now.date}
        featuredService={featuredRef}
        days={upcoming}
      />
      <About locale={locale} />
      <Barber locale={locale} />
      <Services services={site.services} locale={locale} />
      <WhyUs locale={locale} />
      <AvailabilityOverview days={days} today={site.now.date} service={featuredRef} locale={locale} />
      <Prices services={site.services} locale={locale} />
      <Reviews
        reviews={site.reviews}
        googleReviewsUrl={site.settings.googleReviewsUrl}
        googleReviewWriteUrl={site.settings.googleReviewWriteUrl}
        locale={locale}
      />
      <Contact site={site} />
      <CtaBand locale={locale} />
    </>
  );
}
