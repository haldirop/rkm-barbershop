import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import type { Locale } from "@/i18n/config";
import { home } from "@/i18n/messages/home";

export function About({ locale }: { locale: Locale }) {
  const t = home[locale].about;
  return (
    <section aria-labelledby="over-ons" className="border-t border-line py-24 sm:py-32">
      <div className="container-page grid gap-16 lg:grid-cols-2 lg:gap-24">
        <Reveal>
          <SectionHeading
            id="over-ons"
            eyebrow={t.eyebrow}
            title={
              <>
                {t.titleLine}
                <br />
                <em className="text-gold-bright">{t.titleAccent}</em>
              </>
            }
          />
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-muted sm:text-lg">
            {t.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Reveal>

        <ol className="relative space-y-4 self-center">
          {t.steps.map((step, i) => (
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
