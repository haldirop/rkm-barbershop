import { Clock, MessageSquare, Scissors, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import type { Locale } from "@/i18n/config";
import { home } from "@/i18n/messages/home";

const ICONS = [Scissors, Clock, MessageSquare, ShieldCheck];

export function WhyUs({ locale }: { locale: Locale }) {
  const t = home[locale].whyUs;
  return (
    <section aria-labelledby="waarom" className="border-y border-line bg-surface py-24 sm:py-32">
      <div className="container-page">
        <Reveal>
          <SectionHeading id="waarom" eyebrow={t.eyebrow} title={t.title} align="center" />
        </Reveal>
        <ul className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {t.reasons.map(({ title, text }, i) => {
            const Icon = ICONS[i];
            return (
            <Reveal as="li" key={title} delay={i * 90} className="bg-surface p-8">
              <span className="grid size-12 place-items-center rounded-full border border-gold/30 bg-gold/5 text-gold">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-6 text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-2 leading-relaxed text-ink-muted">{text}</p>
            </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
