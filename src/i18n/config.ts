/**
 * Languages of the public website. Dutch is the main language and lives at the plain
 * addresses (/behandelingen); English and German get a prefix and their own page names
 * (/en/treatments, /de/leistungen). The admin and the till stay Dutch.
 *
 * Internally every public page lives under app/(site)/[locale]/ with the Dutch folder
 * names; the proxy (src/proxy.ts) translates between the public and internal addresses.
 * Everything here is plain logic, usable in the proxy, on the server and in the browser.
 */

export const LOCALES = ["nl", "en", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "nl";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** For Intl (dates, prices): British English and German as written in Germany. */
export const INTL_LOCALE: Record<Locale, string> = { nl: "nl-NL", en: "en-GB", de: "de-DE" };

/** Each language in its own words, for the language switch. */
export const LANGUAGE_NAMES: Record<Locale, string> = { nl: "Nederlands", en: "English", de: "Deutsch" };

/** Open Graph locale tags. */
export const OG_LOCALE: Record<Locale, string> = { nl: "nl_NL", en: "en_GB", de: "de_DE" };

/** Remembers a language chosen with the language switch (never set automatically). */
export const LOCALE_COOKIE = "rkm_lang";

/** Request header with the page language, set by the proxy for <html lang>. */
export const LOCALE_HEADER = "x-rkm-locale";

/** Page names per language; the key is the internal (Dutch) folder name. */
const SEGMENTS: Record<string, Record<Locale, string>> = {
  behandelingen: { nl: "behandelingen", en: "treatments", de: "leistungen" },
  "afspraak-maken": { nl: "afspraak-maken", en: "book", de: "termin-buchen" },
  afspraak: { nl: "afspraak", en: "appointment", de: "termin" },
  privacy: { nl: "privacy", en: "privacy", de: "datenschutz" },
};

function splitPath(path: string): { pathname: string; rest: string } {
  const cut = path.search(/[?#]/);
  return cut === -1 ? { pathname: path, rest: "" } : { pathname: path.slice(0, cut), rest: path.slice(cut) };
}

/**
 * A public address for a page, from its Dutch path:
 * ("/afspraak-maken?behandeling=x", "en") → "/en/book?behandeling=x", ("/#prijzen", "de") → "/de#prijzen".
 */
export function localizePath(path: string, locale: Locale): string {
  const { pathname, rest } = splitPath(path);
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] && SEGMENTS[parts[0]]) parts[0] = SEGMENTS[parts[0]][locale];
  const localized = parts.join("/");
  if (locale === DEFAULT_LOCALE) return `/${localized}${rest}`;
  return `/${locale}${localized ? `/${localized}` : ""}${rest}`;
}

/** Absolute public address, for e-mails and the calendar file. */
export function localizedUrl(base: string, path: string, locale: Locale): string {
  return `${base.replace(/\/$/, "")}${localizePath(path, locale)}`;
}

export type RouteMatch =
  /** A public address: serve the internal page. */
  | { kind: "page"; locale: Locale; internal: string }
  /** Not the canonical address of a page (e.g. /nl/… or /en/behandelingen): send the visitor there. */
  | { kind: "redirect"; locale: Locale; to: string };

/**
 * Translates a public pathname to the internal route under app/(site)/[locale]. Unknown
 * pages still map to their language (so the 404 page appears in the right language).
 */
export function resolvePublicPath(pathname: string): RouteMatch {
  const parts = pathname.split("/").filter(Boolean);
  let locale: Locale = DEFAULT_LOCALE;
  let prefixed = false;
  if (isLocale(parts[0])) {
    locale = parts[0];
    prefixed = true;
    parts.shift();
  }

  let canonical = true;
  if (parts[0]) {
    const key = Object.keys(SEGMENTS).find((k) => SEGMENTS[k][locale] === parts[0]);
    const otherKey = key ? undefined : Object.keys(SEGMENTS).find((k) => Object.values(SEGMENTS[k]).includes(parts[0]));
    if (key) parts[0] = key;
    else if (otherKey) {
      // A page name from another language, e.g. /en/behandelingen: go to /en/treatments.
      parts[0] = otherKey;
      canonical = false;
    }
  }
  const internalPath = parts.join("/");
  if ((locale === DEFAULT_LOCALE && prefixed) || !canonical) {
    return { kind: "redirect", locale, to: localizePath(`/${internalPath}`, locale) };
  }
  return { kind: "page", locale, internal: `/${locale}${internalPath ? `/${internalPath}` : ""}` };
}

/**
 * The internal path ("/en/afspraak-maken") for a pathname that may be public ("/en/book")
 * or already internal (what usePathname can return after the proxy rewrote the request).
 */
export function toInternalPath(pathname: string): string {
  let match = resolvePublicPath(pathname);
  if (match.kind === "redirect") match = resolvePublicPath(match.to);
  return match.kind === "page" ? match.internal : `/${DEFAULT_LOCALE}`;
}

/** The same page in another language, for the language switch. */
export function switchLocalePath(currentPublicPath: string, locale: Locale): string {
  const { pathname, rest } = splitPath(currentPublicPath);
  // The internal path is "/<locale>/<dutch path>": drop the language and localize again.
  const dutchPath = toInternalPath(pathname).replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  return localizePath(`${dutchPath}${rest}`, locale);
}

/** The language a visitor's browser prefers, among ours; null when it prefers none of them. */
export function preferredLocale(languages: readonly string[]): Locale | null {
  for (const tag of languages) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return null;
}
