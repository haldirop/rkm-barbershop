import type { MetadataRoute } from "next";
import { LOCALES, localizedUrl } from "@/i18n/config";
import { siteUrl } from "@/server/services/settings";

const PAGES: Array<{ path: string; changeFrequency: "daily" | "weekly" | "monthly" | "yearly"; priority: number }> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/afspraak-maken", changeFrequency: "daily", priority: 0.9 },
  { path: "/behandelingen", changeFrequency: "monthly", priority: 0.8 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
];

/** Every page in every language, each listing its translations (hreflang). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PAGES.flatMap(({ path, changeFrequency, priority }) => {
    const languages = Object.fromEntries(LOCALES.map((l) => [l, localizedUrl(base, path, l)]));
    return LOCALES.map((locale) => ({
      url: localizedUrl(base, path, locale),
      changeFrequency,
      // The Dutch pages stay the main ones.
      priority: locale === "nl" ? priority : Math.round(priority * 8) / 10,
      alternates: { languages },
    }));
  });
}
