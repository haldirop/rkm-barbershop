import { capitalize } from "@/lib/format";
import type { SiteData } from "@/server/services/site";
import { siteUrl } from "@/server/services/settings";

const SCHEMA_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** schema.org structured data for local SEO (HairSalon is a LocalBusiness subtype). */
export function LocalBusinessJsonLd({ site }: { site: SiteData }) {
  const { settings } = site;
  const url = siteUrl();
  const prices = site.services.map((s) => s.priceCents);
  const data = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    "@id": `${url}/#barbershop`,
    name: settings.businessName,
    slogan: settings.tagline,
    url,
    telephone: settings.phone || undefined,
    email: settings.email || undefined,
    image: `${url}/opengraph-image`,
    priceRange: prices.length
      ? `€${Math.min(...prices) / 100} - €${Math.max(...prices) / 100}`
      : undefined,
    address: settings.street
      ? {
          "@type": "PostalAddress",
          streetAddress: settings.street,
          postalCode: settings.postalCode,
          addressLocality: settings.city,
          addressCountry: "NL",
        }
      : undefined,
    openingHoursSpecification: site.openingDays
      .filter((d) => d.isOpen)
      .map((d) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${SCHEMA_DAYS[d.weekday - 1]}`,
        opens: d.open,
        closes: d.close,
      })),
    sameAs: [settings.instagramUrl, settings.facebookUrl].filter(Boolean),
    potentialAction: {
      "@type": "ReserveAction",
      target: `${url}/afspraak-maken`,
      name: "Afspraak maken",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Behandelingen",
      itemListElement: site.services.map((s) => ({
        "@type": "Offer",
        price: (s.priceCents / 100).toFixed(2),
        priceCurrency: "EUR",
        itemOffered: {
          "@type": "Service",
          name: capitalize(s.name),
          description: s.description ?? undefined,
        },
      })),
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
