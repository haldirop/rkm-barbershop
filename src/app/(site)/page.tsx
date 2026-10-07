import { LocalBusinessJsonLd } from "@/components/site/json-ld";
import { About } from "@/components/site/sections/about";
import { AvailabilityOverview } from "@/components/site/sections/availability";
import { Contact } from "@/components/site/sections/contact";
import { CtaBand } from "@/components/site/sections/cta-band";
import { Hero } from "@/components/site/sections/hero";
import { Prices } from "@/components/site/sections/prices";
import { Reviews } from "@/components/site/sections/reviews";
import { Services } from "@/components/site/sections/services";
import { WhyUs } from "@/components/site/sections/why-us";
import { addDays } from "@/lib/time";
import { getCalendar, getSuggestions } from "@/server/services/availability";
import { getSiteData } from "@/server/services/site";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const site = await getSiteData();
  const featured = site.services[0] ?? null;
  const query = { durationMinutes: featured?.durationMinutes ?? 30, barberId: null, now: site.now };
  const [suggestions, days] = await Promise.all([
    getSuggestions({ ...query, maxDays: 3, perDay: 3 }),
    getCalendar(site.now.date, addDays(site.now.date, 13), query),
  ]);
  const featuredRef = featured ? { id: featured.id, name: featured.name } : null;

  return (
    <>
      <LocalBusinessJsonLd site={site} />
      <Hero
        city={site.settings.city}
        tagline={site.settings.tagline}
        status={site.status}
        today={site.now.date}
        featuredService={featuredRef}
        suggestions={suggestions}
      />
      <About />
      <Services services={site.services} />
      <WhyUs />
      <AvailabilityOverview days={days} today={site.now.date} service={featuredRef} />
      <Prices services={site.services} />
      <Reviews reviews={site.reviews} googleReviewsUrl={site.settings.googleReviewsUrl} />
      <Contact site={site} />
      <CtaBand />
    </>
  );
}
