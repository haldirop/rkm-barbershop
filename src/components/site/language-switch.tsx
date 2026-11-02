"use client";

import { Check, ChevronDown, Globe } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "@/i18n/client";
import { LANGUAGE_NAMES, LOCALE_COOKIE, LOCALES, switchLocalePath, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";

/**
 * "Taal · Language · Sprache": in all three languages, so a visitor who doesn't read the
 * current one still recognises it.
 */
export const LANGUAGE_LABEL = "Taal · Language · Sprache";

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

/** Globe button with the current language in the header; opens the list of languages. */
export function LanguageMenu({ className }: { className?: string }) {
  const current = useLocale();
  const switchTo = useSwitchLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${LANGUAGE_LABEL}: ${LANGUAGE_NAMES[current]}`}
        className={cn(
          "flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors",
          open ? "border-gold/60 text-ink" : "border-line-strong text-ink-muted hover:border-gold/50 hover:text-ink",
        )}
      >
        <Globe className="size-4 text-gold" aria-hidden />
        <span className="uppercase">{current}</span>
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div
          id={menuId}
          className="absolute top-full right-0 z-50 mt-2 w-56 animate-fade-in rounded-2xl border border-line-strong bg-surface-2 p-1.5 shadow-2xl"
        >
          <p className="px-3 pt-2 pb-1.5 text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
            {LANGUAGE_LABEL}
          </p>
          <ul>
            {LOCALES.map((locale) => {
              const active = locale === current;
              return (
                <li key={locale}>
                  <button
                    type="button"
                    lang={locale}
                    aria-current={active ? "true" : undefined}
                    onClick={() => {
                      setOpen(false);
                      if (!active) switchTo(locale);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      active ? "bg-gold/10 text-gold-bright" : "text-ink hover:bg-surface-3",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-6 text-xs font-semibold tracking-wider text-ink-faint uppercase">{locale}</span>
                      {LANGUAGE_NAMES[locale]}
                    </span>
                    {active ? <Check className="size-4" aria-hidden /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** The three languages by name, side by side: in the phone menu and the footer. */
export function LanguageList({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  const current = useLocale();
  const switchTo = useSwitchLocale();
  return (
    <nav aria-label={LANGUAGE_LABEL} className={className}>
      <ul className="flex flex-wrap gap-2">
        {LOCALES.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <button
                type="button"
                lang={locale}
                onClick={() => (active ? undefined : switchTo(locale))}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "rounded-full border font-medium transition-colors",
                  size === "lg" ? "px-5 py-2.5 text-base" : "px-3.5 py-1.5 text-sm",
                  active
                    ? "border-gold/60 bg-gold/10 text-gold-bright"
                    : "border-line-strong text-ink-muted hover:border-gold/50 hover:text-ink",
                )}
              >
                {LANGUAGE_NAMES[locale]}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
