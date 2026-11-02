/** The address printed as a QR code on the review card; it forwards to Google (see app/(site)/[locale]/review). */
export const REVIEW_PATH = "/review";

/**
 * Where a review should go, in order: Google's "write a review" link from the admin, the
 * general Google reviews link, or — until one is set — a Google search for the shop, whose
 * result shows a "write a review" button.
 */
export function reviewTarget(settings: {
  businessName: string;
  city: string;
  googleReviewWriteUrl: string | null;
  googleReviewsUrl: string | null;
}): string {
  if (settings.googleReviewWriteUrl) return settings.googleReviewWriteUrl;
  if (settings.googleReviewsUrl) return settings.googleReviewsUrl;
  const query = [settings.businessName, settings.city].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
