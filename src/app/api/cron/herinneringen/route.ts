import { timingSafeEqual } from "node:crypto";
import { cronSecret } from "@/server/config";
import { runScheduledJobs } from "@/server/services/jobs";

export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = cronSecret();
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * GET /api/cron/herinneringen — called daily by Vercel Cron (see vercel.json), which
 * automatically sends `Authorization: Bearer <CRON_SECRET>`. Hourly is fine too.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  try {
    const result = await runScheduledJobs();
    return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[cron] Herinneringen mislukt:", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
