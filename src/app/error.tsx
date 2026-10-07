"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="eyebrow">Er ging iets mis</p>
        <h1 className="heading-display mt-4 text-4xl sm:text-5xl">Even geduld alsjeblieft</h1>
        <p className="mx-auto mt-4 max-w-md text-ink-muted">
          Deze pagina kon niet worden geladen. Probeer het opnieuw — lukt het niet, bel ons dan gerust.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className={buttonClasses({ size: "lg" })}>
            Opnieuw proberen
          </button>
          <Link href="/" className={buttonClasses({ size: "lg", variant: "secondary" })}>
            Naar de homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
