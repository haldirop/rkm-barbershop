import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { isIsoDate, isTimeString } from "@/lib/time";
import { bookingWindow } from "@/server/services/availability";
import { getActiveBarbers } from "@/server/services/catalog";
import { getSiteData } from "@/server/services/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Afspraak maken",
  description:
    "Maak online een afspraak bij RKM Barbershop. Kies je behandeling, barber en een moment dat jou uitkomt — direct zichtbaar welke tijden beschikbaar zijn.",
  alternates: { canonical: "/afspraak-maken" },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BookingPage({ searchParams }: PageProps<"/afspraak-maken">) {
  const params = await searchParams;
  const [site, barbers] = await Promise.all([getSiteData(), getActiveBarbers()]);
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
          Online boeken
        </p>
        <h1 className="heading-display mt-4 text-5xl sm:text-6xl">Afspraak maken</h1>
      </header>

      {site.services.length === 0 || barbers.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-6 text-ink-muted">
          Online boeken is op dit moment niet mogelijk. Bel ons gerust{site.settings.phone ? ` op ${site.settings.phone}` : ""}.
        </p>
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
            barbers={barbers.map((b) => ({ id: b.id, name: b.name, bio: b.bio }))}
            today={site.now.date}
            lastDate={range.lastDate}
            initial={initial}
          />
        </Suspense>
      )}
    </div>
  );
}
