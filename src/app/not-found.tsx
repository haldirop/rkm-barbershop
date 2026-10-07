import Link from "next/link";
import { BrandLockup } from "@/components/site/logo";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grain grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <BrandLockup sizes="14rem" className="mx-auto w-56" />
        <p className="eyebrow mt-8">Pagina niet gevonden</p>
        <h1 className="heading-display mt-4 text-4xl sm:text-5xl">Deze pagina bestaat niet</h1>
        <p className="mx-auto mt-4 max-w-md text-ink-muted">
          Misschien is de link verlopen of verkeerd overgenomen. Ga terug naar de homepage of maak direct een afspraak.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/afspraak-maken" className={buttonClasses({ size: "lg" })}>
            Afspraak maken
          </Link>
          <Link href="/" className={buttonClasses({ size: "lg", variant: "secondary" })}>
            Naar de homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
