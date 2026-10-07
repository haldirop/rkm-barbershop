import { Mail, MapPin, Navigation, Phone } from "lucide-react";
import { OpeningHoursList } from "@/components/site/opening-hours";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { telHref } from "@/lib/format";
import { isoWeekday } from "@/lib/time";
import { formatAddress, mapsUrl } from "@/server/services/settings";
import type { SiteData } from "@/server/services/site";

export function Contact({ site }: { site: SiteData }) {
  const { settings } = site;
  const address = formatAddress(settings);
  return (
    <section aria-labelledby="contact" className="border-t border-line bg-surface py-24 sm:py-32">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            id="contact"
            eyebrow="Contact & locatie"
            title="Kom langs"
            intro="Online boeken is het snelst. Liever even bellen of een vraag stellen? Dat kan natuurlijk ook."
          />
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          <Reveal className="rounded-2xl border border-line bg-canvas p-7">
            <h3 className="eyebrow">Contactgegevens</h3>
            <address className="mt-6 space-y-5 not-italic">
              {settings.phone ? (
                <a href={telHref(settings.phone)} className="group flex items-center gap-4">
                  <span className="grid size-11 place-items-center rounded-full border border-line-strong text-gold transition-colors group-hover:border-gold">
                    <Phone className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-xs text-ink-faint">Telefoon</span>
                    <span className="text-ink">{settings.phone}</span>
                  </span>
                </a>
              ) : null}
              {settings.email ? (
                <a href={`mailto:${settings.email}`} className="group flex items-center gap-4">
                  <span className="grid size-11 place-items-center rounded-full border border-line-strong text-gold transition-colors group-hover:border-gold">
                    <Mail className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-ink-faint">E-mail</span>
                    <span className="block truncate text-ink">{settings.email}</span>
                  </span>
                </a>
              ) : null}
              {address ? (
                <div className="flex items-center gap-4">
                  <span className="grid size-11 place-items-center rounded-full border border-line-strong text-gold">
                    <MapPin className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-xs text-ink-faint">Adres</span>
                    <span className="text-ink">
                      {settings.street}, {settings.postalCode} {settings.city}
                    </span>
                  </span>
                </div>
              ) : null}
            </address>
          </Reveal>

          <Reveal delay={100} className="rounded-2xl border border-line bg-canvas p-7">
            <div className="flex items-center justify-between gap-3">
              <h3 className="eyebrow">Openingstijden</h3>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  site.status.isOpen ? "bg-emerald-400/10 text-emerald-300" : "bg-surface-3 text-ink-muted",
                )}
              >
                {site.status.isOpen ? "Nu open" : "Gesloten"}
              </span>
            </div>
            <OpeningHoursList className="mt-4" days={site.openingDays} todayWeekday={isoWeekday(site.now.date)} />
          </Reveal>

          <Reveal delay={200} className="relative overflow-hidden rounded-2xl border border-line bg-canvas">
            {/* Stylised map: no third-party embed, so no tracking cookies before consent. */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-40 [background:linear-gradient(var(--color-line)_1px,transparent_1px)_0_0/32px_32px,linear-gradient(90deg,var(--color-line)_1px,transparent_1px)_0_0/32px_32px]"
            />
            <div aria-hidden className="absolute top-[38%] left-[-10%] h-10 w-[130%] -rotate-12 bg-surface-3/80" />
            <div aria-hidden className="absolute top-0 left-[58%] h-full w-7 rotate-6 bg-surface-3/60" />
            <div className="relative flex h-full min-h-72 flex-col justify-between p-7">
              <h3 className="eyebrow">Locatie</h3>
              <div className="flex justify-center">
                <span className="relative grid size-16 place-items-center rounded-full bg-gold/15">
                  <span className="absolute inset-0 animate-ping rounded-full bg-gold/10" />
                  <MapPin className="size-7 text-gold" aria-hidden />
                </span>
              </div>
              <div>
                {address ? <p className="mb-4 text-sm text-ink-muted">{address}</p> : null}
                <ButtonLink
                  href={mapsUrl(settings)}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                  className="w-full bg-canvas/80"
                >
                  <Navigation className="size-4" aria-hidden />
                  Routebeschrijving
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
