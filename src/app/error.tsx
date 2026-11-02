"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { localizePath, toInternalPath, type Locale } from "@/i18n/config";
import { common } from "@/i18n/messages/common";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Above the site layout, so the language comes from the address (admin and till: Dutch).
  const pathname = usePathname();
  const locale = toInternalPath(pathname).slice(1, 3) as Locale;
  const t = common[locale].error;
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="heading-display mt-4 text-4xl sm:text-5xl">{t.title}</h1>
        <p className="mx-auto mt-4 max-w-md text-ink-muted">{t.text}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className={buttonClasses({ size: "lg" })}>
            {t.retry}
          </button>
          <Link href={localizePath("/", locale)} className={buttonClasses({ size: "lg", variant: "secondary" })}>
            {t.home}
          </Link>
        </div>
      </div>
    </main>
  );
}
