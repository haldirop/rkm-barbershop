import { DEFAULT_LOCALE, LOCALES, localizePath, type Locale } from "./config";

/**
 * Canonical address of a page in this language, plus the same page in the other
 * languages (hreflang), so search engines show each visitor the right one.
 */
export function alternatesFor(dutchPath: string, locale: Locale) {
  return {
    canonical: localizePath(dutchPath, locale),
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [l, localizePath(dutchPath, l)])),
      "x-default": localizePath(dutchPath, DEFAULT_LOCALE),
    },
  };
}
