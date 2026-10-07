import { MobileBookingBar } from "@/components/site/mobile-booking-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getSiteData } from "@/server/services/site";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const site = await getSiteData();
  return (
    <>
      <a
        href="#inhoud"
        className="sr-only z-[60] rounded-full bg-gold px-4 py-2 font-semibold text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Naar de inhoud
      </a>
      <SiteHeader phone={site.settings.phone} />
      <main id="inhoud">{children}</main>
      <SiteFooter site={site} />
      <MobileBookingBar phone={site.settings.phone} />
    </>
  );
}
