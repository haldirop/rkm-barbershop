"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { LANGUAGE_NAMES, LOCALE_COOKIE, LOCALES, switchLocalePath, type Locale } from "@/i18n/config";
import { common } from "@/i18n/messages/common";
import { cn } from "@/lib/cn";

/** Remembers the choice for a year (see the proxy), then opens the same page in that language. */
export function useSwitchLocale() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (locale: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    const query = searchParams.toString();
    router.push(switchLocalePath(`${pathname}${query ? `?${query}` : ""}`, locale));
  };
}

/** "NL · EN · DE" in the header and the phone menu. */
export function LanguageSwitch({ className, size = "sm" }: { className?: string; size?: "sm" | "lg" }) {
  const current = useLocale();
  const switchTo = useSwitchLocale();
  return (
    <nav aria-label={common[current].language} className={cn("flex items-center", className)}>
      <ul className="flex items-center gap-0.5">
        {LOCALES.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <button
                type="button"
                lang={locale}
                onClick={() => (active ? undefined : switchTo(locale))}
                aria-current={active ? "true" : undefined}
                aria-label={LANGUAGE_NAMES[locale]}
                title={LANGUAGE_NAMES[locale]}
                className={cn(
                  "rounded-full font-semibold tracking-wider uppercase transition-colors",
                  size === "lg" ? "px-4 py-2 text-sm" : "px-2 py-1.5 text-xs",
                  active ? "text-gold" : "text-ink-faint hover:text-ink",
                )}
              >
                {locale}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
