import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { formatDuration, formatPrice } from "@/lib/format";
import type { Service } from "@/server/db/schema";

export function PriceList({ services }: { services: Service[] }) {
  return (
    <ul className="divide-y divide-line">
      {services.map((service) => (
        <li key={service.id} className="flex items-baseline gap-4 py-5">
          <div className="min-w-0">
            <p className="text-lg font-medium text-ink">{service.name}</p>
            <p className="text-sm text-ink-faint">{formatDuration(service.durationMinutes)}</p>
          </div>
          <span className="mb-1.5 flex-1 self-end border-b border-dotted border-line-strong" aria-hidden />
          <span className="font-display text-2xl font-semibold text-gold-bright tabular-nums">
            {formatPrice(service.priceCents)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Prices({ services }: { services: Service[] }) {
  return (
    <section aria-labelledby="prijzen" className="border-t border-line bg-surface py-24 sm:py-32">
      <div className="container-page grid gap-14 lg:grid-cols-[1fr_1.3fr] lg:gap-24">
        <Reveal>
          <SectionHeading
            id="prijzen"
            eyebrow="Prijzen"
            title="Helder geprijsd"
            intro="Geen verrassingen achteraf. Alle prijzen zijn inclusief btw; de tijd die bij een behandeling staat, is volledig voor jou gereserveerd."
          />
          <ButtonLink href="/afspraak-maken" className="mt-8">
            Boek nu
          </ButtonLink>
        </Reveal>
        <Reveal delay={120}>
          <PriceList services={services} />
        </Reveal>
      </div>
    </section>
  );
}
