import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
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
      {/* Background: warm glow, fine diagonal lines (a nod to the barber pole) and a large monogram. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 right-[-10%] size-[46rem] rounded-full bg-gold/10 blur-[140px]" />
        <div className="absolute bottom-[-30%] left-[-15%] size-[38rem] rounded-full bg-gold-deep/10 blur-[160px]" />
        <div className="absolute inset-y-0 right-0 hidden w-1/2 opacity-[0.07] [background:repeating-linear-gradient(115deg,var(--color-gold)_0_1px,transparent_1px_22px)] [mask-image:linear-gradient(to_left,black,transparent)] lg:block" />
        <span className="absolute -right-8 bottom-[-6rem] font-display text-[22rem] leading-none font-semibold text-ink/[0.025] select-none">
          RKM
        </span>
      </div>

      <div className="container-page grid min-h-[100svh] items-center gap-14 pt-28 pb-20 lg:grid-cols-[1.25fr_1fr] lg:pt-24">
        <div className="animate-fade-up">
          <p className="eyebrow flex items-center gap-3">
            <span className="gold-rule" aria-hidden />
            Barbershop{city ? ` in ${city}` : ""}
          </p>
          <h1 id="hero-title" className="heading-display mt-6 text-[3.4rem] leading-[0.95] sm:text-7xl lg:text-[6.2rem]">
            RKM Barbershop
          </h1>
          <p className="mt-5 font-display text-2xl text-gold-bright italic sm:text-3xl">{tagline}</p>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
            Vakmanschap in knippen, fades en baardverzorging. Neem plaats, ontspan, en laat het detailwerk aan
            ons over. Je afspraak regel je in een minuut online.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/afspraak-maken" size="lg">
              Afspraak maken
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/#beschikbaarheid" size="lg" variant="secondary">
              Beschikbaarheid bekijken
            </ButtonLink>
          </div>
          <p className="mt-8 flex items-center gap-2.5 text-sm text-ink-muted">
            <span
              className={cn("size-2 rounded-full", status.isOpen ? "bg-emerald-400 shadow-[0_0_12px] shadow-emerald-400/70" : "bg-ink-faint")}
              aria-hidden
            />
            {status.label}
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
