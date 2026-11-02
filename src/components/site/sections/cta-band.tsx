import { ArrowRight } from "lucide-react";
import { Ornament } from "@/components/site/logo";
import { Reveal } from "@/components/site/reveal";
import { ButtonLink } from "@/components/ui/button";
import { localizePath, type Locale } from "@/i18n/config";
import { common } from "@/i18n/messages/common";
import { home } from "@/i18n/messages/home";

export function CtaBand({ locale }: { locale: Locale }) {
  const t = home[locale].cta;
  return (
    <section aria-labelledby="cta-title" className="relative bg-canvas py-24 sm:py-28">
      <Reveal className="container-page flex flex-col items-center text-center">
        <Ornament className="w-52" />
        <h2 id="cta-title" className="heading-display mt-6 max-w-2xl text-4xl leading-tight sm:text-6xl">
          {t.titleStart} <em className="text-gold-bright">{t.titleAccent}</em>
        </h2>
        <p className="mt-5 max-w-lg text-ink-muted sm:text-lg">{t.text}</p>
        <ButtonLink href={localizePath("/afspraak-maken", locale)} size="lg" className="mt-9">
          {common[locale].book}
          <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
      </Reveal>
    </section>
  );
}
