import "server-only";
import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { openStatus, type OpeningDay } from "@/lib/opening-hours";
import { zonedNow } from "@/lib/time";
import { getDb } from "@/server/db/client";
import { reviews } from "@/server/db/schema";
import { getActiveServices, getBusinessHours, listBlockedTimes } from "./catalog";
import { getSettings } from "./settings";

/** Everything the public pages share, loaded once per request. */
export const getSiteData = cache(async () => {
  const now = zonedNow();
  const [settings, hours, services, publishedReviews, todayBlocks] = await Promise.all([
    getSettings(),
    getBusinessHours(),
    getActiveServices(),
    getDb()
      .select()
      .from(reviews)
      .where(eq(reviews.isPublished, true))
      .orderBy(asc(reviews.sortOrder), asc(reviews.createdAt)),
    listBlockedTimes(now.date, now.date),
  ]);
  const openingDays: OpeningDay[] = hours.map((h) => ({
    weekday: h.weekday,
    isOpen: h.isOpen,
    open: h.openTime.slice(0, 5),
    close: h.closeTime.slice(0, 5),
  }));
  const closedToday = todayBlocks.some((b) => b.barberId === null && !b.startTime);
  return {
    settings,
    openingDays,
    services,
    reviews: publishedReviews,
    status: openStatus(openingDays, now, closedToday),
    now,
  };
});

export type SiteData = Awaited<ReturnType<typeof getSiteData>>;
