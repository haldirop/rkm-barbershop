import { ArrowUpRight, Clock } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { localizePath, type Locale } from "@/i18n/config";
import { home } from "@/i18n/messages/home";
import { formatDuration, formatPrice } from "@/lib/format";
import { bookingHref } from "@/lib/links";
import type { Service } from "@/server/db/schema";

export function ServiceCard({ service, index, locale }: { service: Service; index: number; locale: Locale }) {
  return (
    <Reveal as="li" delay={(index % 3) * 100} className="h-full">
      <Link
        href={localizePath(bookingHref({ serviceId: service.id }), locale)}
        className="group relative flex h-full flex-col rounded-2xl border border-line bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:bg-surface-2"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-2xl font-semibold text-ink sm:text-[1.7rem]">{service.name}</h3>
          <ArrowUpRight
            className="size-5 shrink-0 text-ink-faint transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gold"
            aria-hidden
          />
        </div>
        {service.description ? (
          <p className="mt-3 flex-1 leading-relaxed text-ink-muted">{service.description}</p>
        ) : (
          <div className="flex-1" />
        )}
        <div className="mt-7 flex items-end justify-between border-t border-line pt-5">
          <span className="flex items-center gap-1.5 text-sm text-ink-muted">
            <Clock className="size-4 text-gold" aria-hidden />
            {formatDuration(service.durationMinutes, locale)}
          </span>
          <span className="font-display text-3xl font-semibold text-gold-bright">{formatPrice(service.priceCents, locale)}</span>
        </div>
        <span className="sr-only">{home[locale].services.bookThis}</span>
      </Link>
    </Reveal>
  );
}

export function Services({ services, locale }: { services: Service[]; locale: Locale }) {
  const t = home[locale].services;
  return (
    <section aria-labelledby="behandelingen" className="py-24 sm:py-32">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            id="behandelingen"
            eyebrow={t.eyebrow}
            title={t.title}
            intro={t.intro}
          />
        </Reveal>
        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <ServiceCard key={service.id} service={service} index={i} locale={locale} />
          ))}
        </ul>
      </div>
    </section>
  );
}
