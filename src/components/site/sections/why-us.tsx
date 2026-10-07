import { Clock, MessageSquare, Scissors, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";

const REASONS = [
  {
    Icon: Scissors,
    title: "Vakmanschap",
    text: "Barbers die fades, klassieke cuts en baardwerk tot in de puntjes beheersen.",
  },
  {
    Icon: Clock,
    title: "Afspraak of binnenlopen",
    text: "Met een afspraak zit je op een vast moment in de stoel. Geen afspraak? Loop gerust binnen: als er tijd is, helpen we je meteen.",
  },
  {
    Icon: MessageSquare,
    title: "Persoonlijk advies",
    text: "We denken mee over je haartype, gezichtsvorm en stijl. Wat je met ons advies doet, kies je helemaal zelf.",
  },
  {
    Icon: ShieldCheck,
    title: "Hygiëne & kwaliteit",
    text: "Schone werkplekken, gedesinfecteerde materialen en verzorgende producten.",
  },
];

export function WhyUs() {
  return (
    <section aria-labelledby="waarom" className="border-y border-line bg-surface py-24 sm:py-32">
      <div className="container-page">
        <Reveal>
          <SectionHeading id="waarom" eyebrow="Waarom RKM?" title="De details maken het verschil" align="center" />
        </Reveal>
        <ul className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map(({ Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 90} className="bg-surface p-8">
              <span className="grid size-12 place-items-center rounded-full border border-gold/30 bg-gold/5 text-gold">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-6 text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-2 leading-relaxed text-ink-muted">{text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
