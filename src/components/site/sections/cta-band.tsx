import { ArrowRight } from "lucide-react";
import { Ornament } from "@/components/site/logo";
import { Reveal } from "@/components/site/reveal";
import { ButtonLink } from "@/components/ui/button";

export function CtaBand() {
  return (
    <section aria-labelledby="cta-title" className="grain relative overflow-hidden py-24 sm:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="marble-corners">
          <span className="marble" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(219,168,92,0.14),transparent_65%)]" />
      </div>
      <Reveal className="container-page flex flex-col items-center text-center">
        <Ornament className="w-52" />
        <h2 id="cta-title" className="heading-display mt-6 max-w-2xl text-4xl leading-tight sm:text-6xl">
          Klaar voor een <em className="text-gold-bright">frisse look?</em>
        </h2>
        <p className="mt-5 max-w-lg text-ink-muted sm:text-lg">
          Kies je behandeling, je barber en een moment dat jou uitkomt. Binnen een minuut geregeld.
        </p>
        <ButtonLink href="/afspraak-maken" size="lg" className="mt-9">
          Afspraak maken
          <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
      </Reveal>
    </section>
  );
}
