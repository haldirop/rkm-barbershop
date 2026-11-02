import "server-only";
import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { localizeService, localizedTagline } from "@/i18n/content";
import { openStatus, type OpeningDay } from "@/lib/opening-hours";
import { addDays, zonedNow } from "@/lib/time";
import { getDb } from "@/server/db/client";
import { reviews } from "@/server/db/schema";
import { getActiveServices, getBusinessHours, listBlockedTimes } from "./catalog";
import { getSettings } from "./settings";

/**
 * Everything the public pages share, loaded once per request, in the page language:
 * treatment names, slogan and the "nu open" label follow it.
 */
export const getSiteData = cache(async (locale: Locale = DEFAULT_LOCALE) => {
  const now = zonedNow();
  const [settings, hours, services, publishedReviews, blocks] = await Promise.all([
    getSettings(),
    getBusinessHours(),
    getActiveServices(),
    getDb()
      .select()
      .from(reviews)
      .where(eq(reviews.isPublished, true))
      .orderBy(asc(reviews.sortOrder), asc(reviews.createdAt)),
    // Blocks in the coming months, so "weer open op …" skips a holiday or a later opening date.
    listBlockedTimes(now.date, addDays(now.date, 120)),
  ]);
  const openingDays: OpeningDay[] = hours.map((h) => ({
    weekday: h.weekday,
    isOpen: h.isOpen,
    open: h.openTime.slice(0, 5),
    close: h.closeTime.slice(0, 5),
  }));
  const shopClosures = blocks.filter((b) => b.barberId === null);
  return {
    locale,
    settings,
    tagline: localizedTagline(settings, locale),
    openingDays,
    services: services.map((service) => localizeService(service, locale)),
    reviews: publishedReviews,
    status: openStatus(openingDays, now, shopClosures, 120, locale),
    now,
  };
});

export type SiteData = Awaited<ReturnType<typeof getSiteData>>;
