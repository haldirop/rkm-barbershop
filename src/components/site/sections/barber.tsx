import { ArrowRight } from "lucide-react";
import { Ornament } from "@/components/site/logo";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { bookingHref } from "@/lib/links";
import { getActiveBarbers } from "@/server/services/catalog";

const FACTS = [
  { value: "20 jaar", label: "ervaring als barber" },
  { value: "Gecertificeerd", label: "barber" },
  { value: "Eigenaar", label: "van de zaak" },
];

/** "Je barber": Rohid, owner and (for now) the only barber in the shop. */
export async function Barber() {
  // Book straight into Rohid's agenda when he is listed under Beheer → Barbers.
  const rohid = (await getActiveBarbers()).find((b) => /\brohid\b/i.test(b.name));

  return (
    <section aria-labelledby="barber" className="border-t border-line py-24 sm:py-32">
      <div className="container-page grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
        <Reveal className="lg:order-last">
          <SectionHeading
            id="barber"
            eyebrow="Je barber"
            title={
              <>
                Maak kennis met <em>Rohid</em>
              </>
            }
          />
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-muted sm:text-lg">
            <p>
              Bij RKM Barbershop zit je altijd bij Rohid. Hij is de eigenaar van de zaak, knipt al twintig jaar
              en is gecertificeerd barber. Van een klassieke herensnit tot een strakke skin fade of een baard
              in model: je bent in ervaren handen.
            </p>
            <p>
              Omdat je steeds door dezelfde barber wordt geholpen, hoef je niet elke keer opnieuw uit te leggen
              hoe je het wilt. Rohid kent je stijl en denkt met je mee, zodat het elke keer klopt.
            </p>
          </div>

          <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-[1fr_1.3fr_1fr]">
            {FACTS.map((fact) => (
              <li key={fact.value} className="flex items-baseline gap-2 bg-surface px-5 py-4 sm:flex-col sm:gap-1 sm:px-4 sm:py-5">
                <span className="font-display text-lg font-semibold text-gold-bright">{fact.value}</span>
                <span className="text-sm text-ink-muted">{fact.label}</span>
              </li>
            ))}
          </ul>

          <ButtonLink href={bookingHref({ barberId: rohid?.id })} className="mt-10">
            Maak een afspraak bij Rohid
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
              R
            </span>
            <Ornament className="mt-6 w-40 text-sm" />
            <p className="mt-6 font-display text-2xl font-semibold tracking-[0.3em] text-ink [margin-right:-0.3em]">ROHID</p>
            <p className="eyebrow mt-3">Eigenaar &amp; barber</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
