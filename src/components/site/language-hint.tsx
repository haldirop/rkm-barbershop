"use client";

import { Languages, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useLocale } from "@/i18n/client";
import { LOCALE_COOKIE, preferredLocale, type Locale } from "@/i18n/config";
import { common } from "@/i18n/messages/common";
import { useSwitchLocale } from "./language-switch";

const subscribe = () => () => {};

/** The browser's preferred language among ours, unless a language was already chosen or the hint dismissed. */
function suggestedLocale(): Locale | null {
  if (document.cookie.split("; ").some((c) => c.startsWith(`${LOCALE_COOKIE}=`))) return null;
  return preferredLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);
}

/**
 * A one-time suggestion for visitors whose browser prefers another of our languages:
 * "This website is also available in English". The site never switches by itself.
 * Dismissing it stores the current language as the choice, so it isn't shown again.
 */
export function LanguageHint() {
  const locale = useLocale();
  const switchTo = useSwitchLocale();
  const suggested = useSyncExternalStore(subscribe, suggestedLocale, () => null);
  const [dismissed, setDismissed] = useState(false);
  if (!suggested || suggested === locale || dismissed) return null;

  const t = common[suggested].hint;
  function dismiss() {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    setDismissed(true);
  }

  return (
    <div
      lang={suggested}
      role="region"
      aria-label={t.text}
      className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md animate-fade-up rounded-2xl border border-line-strong bg-surface-2/95 p-4 shadow-2xl backdrop-blur-xl sm:bottom-6 lg:inset-x-auto lg:right-6"
    >
      <div className="flex items-start gap-3">
        <Languages className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
        <p className="flex-1 text-sm text-ink">{t.text}</p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.dismiss}
          className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-3 hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-3 flex gap-2 pl-8">
        <button
          type="button"
          onClick={() => switchTo(suggested)}
          className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-gold-bright"
        >
          {t.action}
        </button>
        <button type="button" onClick={dismiss} className="rounded-full px-4 py-2 text-sm text-ink-muted hover:text-ink">
          {t.dismiss}
        </button>
      </div>
    </div>
  );
}
