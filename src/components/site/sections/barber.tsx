import { ArrowRight } from "lucide-react";
import { Ornament } from "@/components/site/logo";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { bookingHref } from "@/lib/links";
import { getActiveBarbers } from "@/server/services/catalog";

/** The owner's story is told here; every other barber comes from Beheer → Barbers (name + short description). */
const OWNER = "Rohid";

const FACTS = [
  { value: "20 jaar", label: "ervaring als barber" },
  { value: "Gecertificeerd", label: "barber" },
  { value: "Eigenaar", label: "van de zaak" },
];

/**
 * "Je barber" / "Het team": the owner first, then every other active barber, each with a
 * button that opens the booking flow with that barber already selected.
 */
export async function Barber() {
  const barbers = await getActiveBarbers();
  const owner = barbers.find((b) => b.name.toLowerCase().includes(OWNER.toLowerCase()));
  const team = barbers.filter((b) => b !== owner);

  return (
    <section aria-labelledby="barber" className="border-t border-line py-24 sm:py-32">
      <div className="container-page">
        <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
          <Reveal className="lg:order-last">
            <SectionHeading
              id="barber"
              eyebrow={team.length ? "Het team" : "Je barber"}
              title={
                <>
                  Maak kennis met <em>{OWNER}</em>
                </>
              }
            />
            <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-muted sm:text-lg">
              {team.length ? (
                <>
                  <p>
                    {OWNER} is de eigenaar van RKM Barbershop. Hij knipt al twintig jaar en is gecertificeerd
                    barber. Van een klassieke herensnit tot een strakke skin fade of een baard in model: je bent in
                    ervaren handen.
                  </p>
                  <p>
                    Je kiest zelf bij wie je zit. Ga je steeds naar dezelfde barber, dan hoef je niet elke keer
                    opnieuw uit te leggen hoe je het wilt.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Bij RKM Barbershop zit je altijd bij {OWNER}. Hij is de eigenaar van de zaak, knipt al twintig
                    jaar en is gecertificeerd barber. Van een klassieke herensnit tot een strakke skin fade of een
                    baard in model: je bent in ervaren handen.
                  </p>
                  <p>
                    Omdat je steeds door dezelfde barber wordt geholpen, hoef je niet elke keer opnieuw uit te
                    leggen hoe je het wilt. {OWNER} kent je stijl en denkt met je mee, zodat het elke keer klopt.
                  </p>
                </>
              )}
            </div>

            <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-[1fr_1.3fr_1fr]">
              {FACTS.map((fact) => (
                <li key={fact.value} className="flex items-baseline gap-2 bg-surface px-5 py-4 sm:flex-col sm:gap-1 sm:px-4 sm:py-5">
                  <span className="font-display text-lg font-semibold text-gold-bright">{fact.value}</span>
                  <span className="text-sm text-ink-muted">{fact.label}</span>
                </li>
              ))}
            </ul>

            <ButtonLink href={bookingHref({ barberId: owner?.id })} className="mt-10">
              Maak een afspraak bij {OWNER}
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </Reveal>

          {/* Name card in the style of the business card: black marble, gold beams and a gold monogram. */}
          <Reveal delay={120}>
            <div className="grain relative mx-auto flex aspect-[4/5] max-w-md flex-col items-center justify-center overflow-hidden rounded-3xl border border-line bg-surface p-10 text-center">
              <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                <div className="marble-corners">
                  <span className="marble" />
                </div>
                <div className="absolute top-1/2 left-1/2 size-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/10 blur-[90px]" />
                <span className="gold-beam right-[-6rem] bottom-[3.5rem] w-[22rem] -rotate-[52deg] opacity-70" />
                <span className="gold-beam right-[-7rem] bottom-[1.5rem] w-[24rem] -rotate-[52deg] opacity-40" />
              </div>
              <span aria-hidden className="text-gold-metal font-display text-[8rem] leading-none font-semibold sm:text-[10rem]">
                {OWNER[0]}
              </span>
              <Ornament className="mt-6 w-40 text-sm" />
              <p className="mt-6 font-display text-2xl font-semibold tracking-[0.3em] text-ink uppercase [margin-right:-0.3em]">
                {OWNER}
              </p>
              <p className="eyebrow mt-3">Eigenaar &amp; barber</p>
            </div>
          </Reveal>
        </div>

        {team.length ? (
          <div className="mt-20">
            <Reveal>
              <h3 className="eyebrow flex items-center gap-3">
                <span className="gold-rule" aria-hidden />
                Ook in het team
              </h3>
            </Reveal>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((barber, i) => (
                <Reveal as="li" key={barber.id} delay={i * 90} className="flex flex-col rounded-2xl border border-line bg-surface p-6">
                  <div className="flex items-center gap-4">
                    <span
                      aria-hidden
                      className="text-gold-metal grid size-14 shrink-0 place-items-center rounded-full border border-gold/30 bg-gold/5 font-display text-2xl font-semibold"
                    >
                      {barber.name.charAt(0).toUpperCase()}
                    </span>
                    <h4 className="font-display text-xl font-semibold text-ink">{barber.name}</h4>
                  </div>
                  {barber.bio ? <p className="mt-4 text-sm leading-relaxed text-ink-muted">{barber.bio}</p> : null}
                  <div className="mt-auto pt-6">
                    <ButtonLink href={bookingHref({ barberId: barber.id })} variant="secondary">
                      Afspraak bij {barber.name}
                      <ArrowRight className="size-4" aria-hidden />
                    </ButtonLink>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
