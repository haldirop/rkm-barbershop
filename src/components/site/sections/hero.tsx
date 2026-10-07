import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import { BrandLockup } from "@/components/site/logo";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { relativeDayLabel } from "@/lib/format";
import { bookingHref } from "@/lib/links";
import type { Suggestion } from "@/server/services/availability";

export function Hero({
  city,
  tagline,
  status,
  today,
  featuredService,
  suggestions,
}: {
  city: string;
  tagline: string;
  status: { isOpen: boolean; label: string };
  today: string;
  featuredService: { id: string; name: string } | null;
  suggestions: Suggestion[];
}) {
  return (
    <section aria-labelledby="hero-title" className="grain relative overflow-hidden">
      {/* Background as on the business card: black marble in the corners, diagonal gold beams and a warm glow. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="marble-corners">
          <span className="marble" />
        </div>
        <div className="absolute -top-40 right-[-10%] size-[46rem] rounded-full bg-gold/10 blur-[140px]" />
        <div className="absolute top-[18%] left-[8%] size-[30rem] rounded-full bg-gold/[0.07] blur-[120px]" />
        <span className="gold-beam right-[-7rem] bottom-[7rem] w-[30rem] -rotate-[52deg] opacity-80" />
        <span className="gold-beam right-[-8rem] bottom-[4rem] w-[34rem] -rotate-[52deg] opacity-45" />
      </div>

      <div className="container-page grid min-h-[100svh] items-center gap-14 pt-28 pb-20 lg:grid-cols-[1.2fr_1fr] lg:pt-24">
        <div className="flex animate-fade-up flex-col items-center text-center lg:items-start lg:text-left">
          <h1 id="hero-title" className="w-full max-w-[26rem] sm:max-w-[30rem]">
            <span className="sr-only">RKM Barbershop</span>
            <BrandLockup priority sizes="(min-width: 640px) 26rem, 80vw" />
          </h1>
          <p className="mt-8 font-serif text-2xl text-gold-bright italic sm:text-3xl">{tagline}</p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
            Vakmanschap in knippen, fades en baardverzorging. Neem plaats, ontspan, en laat het detailwerk aan
            ons over. Je afspraak regel je in een minuut online.
          </p>
          <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <ButtonLink href="/afspraak-maken" size="lg">
              Afspraak maken
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/#beschikbaarheid" size="lg" variant="secondary">
              Beschikbaarheid bekijken
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
                Barbershop in {city}
              </span>
            ) : null}
          </p>
        </div>

        <div className="animate-fade-up [animation-delay:150ms]">
          <div className="relative rounded-3xl border border-line bg-surface/70 p-6 backdrop-blur-sm sm:p-8">
            <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" aria-hidden />
            <p className="flex items-center gap-2 text-sm font-semibold text-gold">
              <Sparkles className="size-4" aria-hidden />
              Beste beschikbaarheid
            </p>
            <p className="mt-1 text-sm text-ink-faint">
              {featuredService ? `${featuredService.name} · ` : ""}eerstvolgende goede momenten
            </p>
            {suggestions.length ? (
              <ul className="mt-6 space-y-5">
                {suggestions.map((s) => (
                  <li key={s.date}>
                    <p className="text-sm font-medium text-ink">{relativeDayLabel(s.date, today)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {s.times.map((time) => (
                        <Link
                          key={time}
                          href={bookingHref({ serviceId: featuredService?.id, date: s.date, time })}
                          className="rounded-full border border-line-strong px-4 py-2 text-sm font-medium text-ink tabular-nums transition-colors hover:border-gold hover:bg-gold/10 hover:text-gold-bright"
                        >
                          {time}
                        </Link>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-sm text-ink-muted">
                Er zijn op dit moment geen vrije plekken online. Bel ons gerust, dan kijken we samen.
              </p>
            )}
            <p className="mt-7 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
              Op basis van de huidige agenda zijn deze tijden het meest waarschijnlijk beschikbaar.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
