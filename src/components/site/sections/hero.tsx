import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { FreeTimes } from "@/components/site/free-times";
import { BrandLockup } from "@/components/site/logo";
import { ButtonLink } from "@/components/ui/button";
import { localizePath, type Locale } from "@/i18n/config";
import { common } from "@/i18n/messages/common";
import { home } from "@/i18n/messages/home";
import { cn } from "@/lib/cn";
import type { UpcomingDay } from "@/server/services/availability";

export function Hero({
  locale,
  city,
  tagline,
  status,
  today,
  featuredService,
  days,
}: {
  locale: Locale;
  city: string;
  tagline: string;
  status: { isOpen: boolean; label: string };
  today: string;
  featuredService: { id: string; name: string } | null;
  /** The coming open days with all their free times (for the featured treatment). */
  days: UpcomingDay[];
}) {
  const t = home[locale].hero;
  return (
    // Plain black behind the logo: no marble, beams or glow.
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-canvas">
      <div className="container-page grid min-h-[100svh] items-center gap-14 pt-28 pb-20 lg:grid-cols-[1.2fr_1fr] lg:pt-24">
        <div className="flex animate-fade-up flex-col items-center text-center lg:items-start lg:text-left">
          <h1 id="hero-title" className="w-full max-w-[22rem] sm:max-w-[27rem]">
            <span className="sr-only">RKM Barbershop</span>
            <BrandLockup priority sizes="(min-width: 640px) 27rem, 22rem" />
          </h1>
          <p className="mt-8 font-serif text-2xl text-gold-bright italic sm:text-3xl">{tagline}</p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">{t.intro}</p>
          <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <ButtonLink href={localizePath("/afspraak-maken", locale)} size="lg">
              {common[locale].book}
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href={localizePath("/#beschikbaarheid", locale)} size="lg" variant="secondary">
              {t.seeAvailability}
            </ButtonLink>
          </div>
          <p className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-ink-muted lg:justify-start">
            <span className="flex items-center gap-2.5">
              <span
                className={cn("size-2 rounded-full", status.isOpen ? "bg-emerald-400 shadow-[0_0_12px] shadow-emerald-400/70" : "bg-ink-faint")}
                aria-hidden
              />
              {status.label}
            </span>
            {city ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4 text-gold" aria-hidden />
                {t.location(city)}
              </span>
            ) : null}
          </p>
        </div>

        <div className="animate-fade-up [animation-delay:150ms]">
          <div className="relative rounded-3xl border border-line bg-surface/70 p-6 backdrop-blur-sm sm:p-8">
            <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" aria-hidden />
            <p className="flex items-center gap-2 text-sm font-semibold text-gold">
              <CalendarDays className="size-4" aria-hidden />
              {t.bestTitle}
            </p>
            <p className="mt-1 text-sm text-ink-faint">
              {featuredService ? `${featuredService.name} · ` : ""}
              {t.bestSubtitle}
            </p>
            <FreeTimes days={days} today={today} serviceId={featuredService?.id ?? null} />
            <p className="mt-7 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">{t.bestNote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
