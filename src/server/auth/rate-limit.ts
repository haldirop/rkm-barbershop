import "server-only";
import { and, count, eq, gte, lt } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/server/db/client";
import { rateLimitEvents } from "@/server/db/schema";
import { sha256 } from "@/server/security";

/**
 * Database-backed sliding window. Works across server instances without extra
 * infrastructure. Keys are hashed so no raw IPs or e-mail addresses are stored.
 */
export async function isRateLimited(key: string, limit: number, windowMinutes: number): Promise<boolean> {
  const db = getDb();
  const since = new Date(Date.now() - windowMinutes * 60_000);
  const [{ hits }] = await db
    .select({ hits: count() })
    .from(rateLimitEvents)
    .where(and(eq(rateLimitEvents.key, sha256(key)), gte(rateLimitEvents.createdAt, since)));
  return hits >= limit;
}

export async function recordHit(key: string) {
  const db = getDb();
  await db.insert(rateLimitEvents).values({ key: sha256(key) });
  // Opportunistic cleanup of entries older than a day.
  if (Math.random() < 0.05) {
    await db.delete(rateLimitEvents).where(lt(rateLimitEvents.createdAt, new Date(Date.now() - 86_400_000)));
  }
}

export async function clearHits(key: string) {
  await getDb().delete(rateLimitEvents).where(eq(rateLimitEvents.key, sha256(key)));
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
