import { Clock, MessageSquare, Scissors, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import type { Locale } from "@/i18n/config";
import { home } from "@/i18n/messages/home";
import { currentYear, experienceYears } from "@/lib/barber-profile";
import { getActiveBarbers } from "@/server/services/catalog";

const ICONS = [Scissors, Clock, MessageSquare, ShieldCheck];

export async function WhyUs({ locale }: { locale: Locale }) {
  const t = home[locale].whyUs;
  // "20 jaar ervaring": the most experienced active barber, as entered under Beheer → Barbers.
  const year = currentYear();
  const years = (await getActiveBarbers())
    .map((barber) => experienceYears(barber.experienceSince, year))
    .reduce<number | null>((most, y) => (y !== null && (most === null || y > most) ? y : most), null);
  const reasons = [{ title: t.craft.title, text: t.craft.text(years) }, ...t.reasons];
  return (
    <section aria-labelledby="waarom" className="border-y border-line bg-surface py-24 sm:py-32">
      <div className="container-page">
        <Reveal>
          <SectionHeading id="waarom" eyebrow={t.eyebrow} title={t.title} align="center" />
        </Reveal>
        <ul className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map(({ title, text }, i) => {
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
