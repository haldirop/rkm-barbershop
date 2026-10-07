import { Star } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ReviewForm } from "@/components/admin/review-form";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { requireAdmin } from "@/server/auth/session";
import { listReviews } from "@/server/services/admin-config";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  await requireAdmin();
  const reviews = await listReviews();
  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Reviews die op de homepage staan. Zet in Instellingen ook je Google-reviewlink, dan verschijnt er een knop naar al je reviews."
      />
      <div className="space-y-4">
        {reviews.map((review) => (
          <details key={review.id} className="group rounded-2xl border border-line bg-surface open:border-line-strong">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 flex-wrap items-center gap-3">
                <span className="flex text-gold" aria-label={`${review.rating} sterren`}>
                  {Array.from({ length: review.rating }, (_, i) => (
                    <Star key={i} className="size-3.5 fill-gold" aria-hidden />
                  ))}
                </span>
                <span className="font-medium text-ink">{review.authorName}</span>
                {review.isDemo ? <DemoBadge /> : null}
                {!review.isPublished ? <Badge className="bg-zinc-400/10 text-zinc-300 ring-zinc-400/30">Verborgen</Badge> : null}
              </span>
              <span className="text-sm text-gold group-open:hidden">Bewerken</span>
            </summary>
            <div className="border-t border-line p-5">
              <ReviewForm review={review} />
            </div>
          </details>
        ))}
        {reviews.length === 0 ? (
          <p className="rounded-2xl border border-line bg-surface p-5 text-sm text-ink-muted">
            Nog geen reviews. Zonder reviews wordt de reviewsectie op de website verborgen (of alleen de Google-link getoond).
          </p>
        ) : null}
      </div>
      <section className="mt-10 rounded-2xl border border-dashed border-line-strong p-5 sm:p-6">
        <h2 className="mb-5 text-lg font-semibold text-ink">Review toevoegen</h2>
        <ReviewForm />
      </section>
    </div>
  );
}
