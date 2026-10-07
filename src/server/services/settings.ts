import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { getDb, type DbOrTx } from "@/server/db/client";
import { settings, type Settings } from "@/server/db/schema";

export async function loadSettings(db: DbOrTx = getDb()): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (row) return row;
  const [created] = await db.insert(settings).values({ id: 1 }).onConflictDoNothing().returning();
  return created ?? (await db.select().from(settings).where(eq(settings.id, 1)))[0];
}

/** Settings for the current request (deduplicated across components). */
export const getSettings = cache(() => loadSettings());

export function formatAddress(s: Pick<Settings, "street" | "postalCode" | "city">): string {
  return [s.street, [s.postalCode, s.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

export function mapsUrl(s: Pick<Settings, "businessName" | "street" | "postalCode" | "city">): string {
  const query = [s.businessName, formatAddress(s)].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export { siteUrl } from "@/server/config";
