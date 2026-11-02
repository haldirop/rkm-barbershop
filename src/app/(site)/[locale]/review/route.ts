import { reviewTarget } from "@/lib/review-link";
import { getSettings } from "@/server/services/settings";

/**
 * GET /review (also /en/review and /de/review): the address behind the QR code on the
 * review card. It forwards to Google, so the Google link can change without reprinting cards.
 */
export async function GET() {
  const settings = await getSettings().catch((error) => {
    console.error("[review] Instellingen laden mislukt:", error);
    return null;
  });
  const target = settings
    ? reviewTarget(settings)
    : reviewTarget({ businessName: "RKM Barbershop", city: "", googleReviewWriteUrl: null, googleReviewsUrl: null });
  return new Response(null, { status: 307, headers: { Location: target, "Cache-Control": "no-store" } });
}
