import type { ReactNode } from "react";
import { Logo } from "@/components/site/logo";

/** Centered card used by the login and password pages. */
export function AuthCard({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <main className="grain relative grid min-h-dvh place-items-center px-4 py-16">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(200,169,106,0.12),transparent_60%)]"
      />
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo href="/" />
        </div>
        <div className="mt-10 rounded-3xl border border-line bg-surface p-7 sm:p-8">
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          {intro ? <p className="mt-1 text-sm text-ink-muted">{intro}</p> : null}
          {children}
        </div>
      </div>
    </main>
  );
}
