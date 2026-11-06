import { ArrowRight } from "lucide-react";
import { Ornament } from "@/components/site/logo";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { localizePath, type Locale } from "@/i18n/config";
import { localizedBio, localizedIntro, localizedRole } from "@/i18n/content";
import { home } from "@/i18n/messages/home";
import { currentYear, experienceYears, featuredBarber, paragraphs } from "@/lib/barber-profile";
import { bookingHref } from "@/lib/links";
import { getActiveBarbers } from "@/server/services/catalog";

/** Grid for the 1–3 fact tiles under the introduction. */
const FACT_COLUMNS = ["", "sm:grid-cols-1 sm:max-w-xs", "sm:grid-cols-2", "sm:grid-cols-[1fr_1.3fr_1fr]"];

/**
 * "Je barber" / "Het team": the owner first (ticked under Beheer → Barbers), with their
 * introduction, experience and role, then every other active barber. Each has a button that
 * opens the booking flow with that barber already selected.
 */
export async function Barber({ locale }: { locale: Locale }) {
  const t = home[locale].barber;
  const barbers = await getActiveBarbers();
  const owner = featuredBarber(barbers);
  if (!owner) return null;
  const team = barbers.filter((b) => b !== owner);

  const year = currentYear();
  const roleOf = (barber: typeof owner) => localizedRole(barber, locale) ?? (barber.isOwner ? t.ownerRole : t.barberRole);
  const ownerYears = experienceYears(owner.experienceSince, year);
  const facts = [
    ownerYears ? t.facts.experience(ownerYears) : null,
    owner.isCertified ? t.facts.certified : null,
    owner.isOwner ? t.facts.owner : null,
  ].filter((fact) => fact !== null);
  const intro = paragraphs(localizedIntro(owner, locale));
  const story = [...(intro.length ? intro : [t.defaultIntro(owner.name)]), team.length ? t.team : t.solo(owner.name)];

  return (
    <section aria-labelledby="barber" className="border-t border-line py-24 sm:py-32">
      <div className="container-page">
        <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
          <Reveal className="lg:order-last">
            <SectionHeading
              id="barber"
              eyebrow={team.length ? t.eyebrowTeam : t.eyebrowSolo}
              title={
                <>
                  {t.meet[0]} <em>{owner.name}</em>
                  {t.meet[1] ? ` ${t.meet[1]}` : null}
                </>
              }
            />
            <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-muted sm:text-lg">
              {story.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>

            {facts.length ? (
              <ul
                className={`mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line ${FACT_COLUMNS[facts.length]}`}
              >
                {facts.map((fact) => (
                  <li key={fact.label} className="flex items-baseline gap-2 bg-surface px-5 py-4 sm:flex-col sm:gap-1 sm:px-4 sm:py-5">
                    <span className="font-display text-lg font-semibold text-gold-bright">{fact.value}</span>
                    <span className="text-sm text-ink-muted">{fact.label}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <ButtonLink href={localizePath(bookingHref({ barberId: owner.id }), locale)} className="mt-10">
              {t.bookWith(owner.name)}
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
                {owner.name.charAt(0).toUpperCase()}
              </span>
              <Ornament className="mt-6 w-40 text-sm" />
              <p className="mt-6 font-display text-2xl font-semibold tracking-[0.3em] text-ink uppercase [margin-right:-0.3em]">
                {owner.name}
              </p>
              <p className="eyebrow mt-3">{roleOf(owner)}</p>
            </div>
          </Reveal>
        </div>

        {team.length ? (
          <div className="mt-20">
            <Reveal>
              <h3 className="eyebrow flex items-center gap-3">
                <span className="gold-rule" aria-hidden />
                {t.alsoInTeam}
              </h3>
            </Reveal>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((barber, i) => {
                const years = experienceYears(barber.experienceSince, year);
                const bio = localizedBio(barber, locale);
                const badges = [
                  years ? t.experienceShort(years) : null,
                  barber.isCertified ? t.certifiedShort : null,
                ].filter((badge) => badge !== null);
                return (
                  <Reveal as="li" key={barber.id} delay={i * 90} className="flex flex-col rounded-2xl border border-line bg-surface p-6">
                    <div className="flex items-center gap-4">
                      <span
                        aria-hidden
                        className="text-gold-metal grid size-14 shrink-0 place-items-center rounded-full border border-gold/30 bg-gold/5 font-display text-2xl font-semibold"
                      >
                        {barber.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-display text-xl font-semibold text-ink">{barber.name}</h4>
                        <p className="eyebrow mt-1">{roleOf(barber)}</p>
                      </div>
                    </div>
                    {bio ? <p className="mt-4 text-sm leading-relaxed text-ink-muted">{bio}</p> : null}
                    {badges.length ? (
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {badges.map((badge) => (
                          <li key={badge} className="rounded-full border border-gold/25 bg-gold/5 px-3 py-1 text-xs font-medium text-gold-bright">
                            {badge}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-auto pt-6">
                      <ButtonLink href={localizePath(bookingHref({ barberId: barber.id }), locale)} variant="secondary">
                        {t.bookWithShort(barber.name)}
                        <ArrowRight className="size-4" aria-hidden />
                      </ButtonLink>
                    </div>
                  </Reveal>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
