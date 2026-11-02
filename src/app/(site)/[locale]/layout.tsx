import type { Metadata } from "next";
import { LanguageHint } from "@/components/site/language-hint";
import { MobileBookingBar } from "@/components/site/mobile-booking-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { LocaleProvider } from "@/i18n/client";
import { LOCALES, OG_LOCALE } from "@/i18n/config";
import { common } from "@/i18n/messages/common";
import { home } from "@/i18n/messages/home";
import { alternatesFor } from "@/i18n/seo";
import { pageLocale } from "@/i18n/server";
import { getSettings } from "@/server/services/settings";
import { getSiteData } from "@/server/services/site";

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  // The title includes the city from the settings; fall back to defaults if the database is unavailable.
  const settings = await getSettings().catch(() => ({ businessName: "RKM Barbershop", city: "" }));
  const t = home[locale].meta;
  const place = settings.city ? t.place(settings.city) : "";
  const title = t.title(settings.businessName, place);
  const description = t.description(settings.businessName, place);
  return {
    title: { default: title, template: `%s | ${settings.businessName}` },
    description,
    keywords: t.keywords(settings.city),
    openGraph: {
      type: "website",
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      siteName: settings.businessName,
      title,
      description,
    },
    alternates: alternatesFor("/", locale),
  };
}

export default async function SiteLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = await pageLocale(params);
  const site = await getSiteData(locale);
  return (
    <LocaleProvider locale={locale}>
      <a
        href="#inhoud"
        className="sr-only z-[60] rounded-full bg-gold px-4 py-2 font-semibold text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {common[locale].skipToContent}
      </a>
      <SiteHeader phone={site.settings.phone} />
      <main id="inhoud">{children}</main>
      <SiteFooter site={site} />
      <MobileBookingBar phone={site.settings.phone} />
      <LanguageHint />
    </LocaleProvider>
  );
}
