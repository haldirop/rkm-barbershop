import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { localizedBio } from "@/i18n/content";
import { home } from "@/i18n/messages/home";
import { alternatesFor } from "@/i18n/seo";
import { pageLocale } from "@/i18n/server";
import { isIsoDate, isTimeString } from "@/lib/time";
import { bookingWindow } from "@/server/services/availability";
import { getActiveBarbers } from "@/server/services/catalog";
import { getSiteData } from "@/server/services/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/afspraak-maken">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = home[locale].meta;
  return {
    title: t.bookingTitle,
    description: t.bookingDescription,
    alternates: alternatesFor("/afspraak-maken", locale),
  };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BookingPage({ params: routeParams, searchParams }: PageProps<"/[locale]/afspraak-maken">) {
  const locale = await pageLocale(routeParams);
  const t = home[locale].booking;
  const params = await searchParams;
  const [site, barbers] = await Promise.all([getSiteData(locale), getActiveBarbers()]);
  const range = bookingWindow(site.settings, site.now);

  const serviceId = first(params.behandeling);
  const barberId = first(params.barber);
  const date = first(params.datum);
  const time = first(params.tijd);
  const initial = {
    serviceId: site.services.some((s) => s.id === serviceId) ? serviceId : undefined,
    barberId: barbers.some((b) => b.id === barberId) ? barberId : undefined,
    date: date && isIsoDate(date) && date >= range.firstDate && date <= range.lastDate ? date : undefined,
    time: time && isTimeString(time) ? time.slice(0, 5) : undefined,
  };

  return (
    <div className="container-page pt-28 pb-24 sm:pt-32">
      <header className="mb-10 max-w-2xl">
        <p className="eyebrow flex items-center gap-3">
          <span className="gold-rule" aria-hidden />
          {t.eyebrow}
        </p>
        <h1 className="heading-display mt-4 text-5xl sm:text-6xl">{t.title}</h1>
      </header>

      {site.services.length === 0 || barbers.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-6 text-ink-muted">{t.unavailable(site.settings.phone)}</p>
      ) : (
        <Suspense>
          <BookingWizard
            services={site.services.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              priceCents: s.priceCents,
              durationMinutes: s.durationMinutes,
            }))}
            barbers={barbers.map((b) => ({ id: b.id, name: b.name, bio: localizedBio(b, locale) }))}
            today={site.now.date}
            lastDate={range.lastDate}
            bufferMinutes={site.settings.bufferMinutes}
            initial={initial}
          />
        </Suspense>
      )}
    </div>
  );
}
