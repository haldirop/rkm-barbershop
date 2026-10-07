import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";

const STEPS = [
  { title: "Even afstemmen", text: "Elke behandeling begint met een kort gesprek: wat wil je, en wat past bij je haar en je routine?" },
  { title: "Precisiewerk", text: "Schaar, tondeuse en mes, met aandacht voor elke overgang en elke lijn." },
  { title: "Strak afgewerkt", text: "Styling en een eerlijk advies, zodat je look ook thuis goed blijft zitten." },
];

export function About() {
  return (
    <section aria-labelledby="over-ons" className="border-t border-line py-24 sm:py-32">
      <div className="container-page grid gap-16 lg:grid-cols-2 lg:gap-24">
        <Reveal>
          <SectionHeading
            id="over-ons"
            eyebrow="Over RKM Barbershop"
            title={
              <>
                Vakmanschap,
                <br />
                <em className="text-gold-bright">zonder haast.</em>
              </>
            }
          />
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-muted sm:text-lg">
            <p>
              RKM Barbershop is een plek waar je even tot rust komt. We nemen de tijd om te luisteren,
              adviseren eerlijk en werken met oog voor detail — van de eerste knip tot de laatste lijn met
              het mes.
            </p>
            <p>
              Of je nu komt voor je vaste knipbeurt, een strakke skin fade of een verzorgde baard: je
              afspraak staat vast en je wordt op tijd geholpen.
            </p>
          </div>
        </Reveal>

        <ol className="relative space-y-4 self-center">
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 120}>
              <div className="flex gap-6 rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-line-strong sm:p-7">
                <span className="font-display text-4xl leading-none text-gold/80 tabular-nums">0{i + 1}</span>
                <div>
                  <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1.5 leading-relaxed text-ink-muted">{step.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
