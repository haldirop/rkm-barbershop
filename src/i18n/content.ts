import type { Locale } from "./config";

/**
 * Texts the owner types in the admin (treatment names, slogan, barber bios) have an
 * English and German field. Left empty, the Dutch text is shown.
 */
function pick(locale: Locale, nl: string, en: string | null | undefined, de: string | null | undefined): string {
  const value = locale === "en" ? en : locale === "de" ? de : null;
  return value?.trim() || nl;
}

export function localizeService<
  T extends {
    name: string;
    description: string | null;
    nameEn: string | null;
    nameDe: string | null;
    descriptionEn: string | null;
    descriptionDe: string | null;
  },
>(service: T, locale: Locale): T {
  if (locale === "nl") return service;
  return {
    ...service,
    name: pick(locale, service.name, service.nameEn, service.nameDe),
    description: service.description === null && !service.descriptionEn && !service.descriptionDe
      ? null
      : pick(locale, service.description ?? "", service.descriptionEn, service.descriptionDe) || null,
  };
}

export function localizedTagline(
  settings: { tagline: string; taglineEn: string | null; taglineDe: string | null },
  locale: Locale,
): string {
  return pick(locale, settings.tagline, settings.taglineEn, settings.taglineDe);
}

export function localizedBio(barber: { bio: string | null; bioEn: string | null; bioDe: string | null }, locale: Locale) {
  if (barber.bio === null && !barber.bioEn && !barber.bioDe) return null;
  return pick(locale, barber.bio ?? "", barber.bioEn, barber.bioDe) || null;
}
