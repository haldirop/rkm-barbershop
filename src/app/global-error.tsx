"use client";

import "./globals.css";

/** Last-resort error page (replaces the root layout), e.g. when the database is unreachable. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="nl">
      <body className="grid min-h-dvh place-items-center bg-canvas px-4 text-center font-sans text-ink">
        <main>
          <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">RKM Barbershop</p>
          <h1 className="mt-4 text-3xl font-semibold">De website is even niet bereikbaar</h1>
          <p className="mx-auto mt-3 max-w-md text-ink-muted">
            Probeer het over een paar minuten opnieuw. Wil je direct een afspraak maken? Bel ons dan gerust.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-8 h-12 rounded-full bg-gold px-7 font-semibold text-canvas hover:bg-gold-bright"
          >
            Opnieuw proberen
          </button>
        </main>
      </body>
    </html>
  );
}
