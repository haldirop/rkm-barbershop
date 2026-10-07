import { ExternalLink, Star } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { Review } from "@/server/db/schema";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} van 5 sterren`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn("size-4", i < rating ? "fill-gold text-gold" : "text-line-strong")}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function Reviews({ reviews, googleReviewsUrl }: { reviews: Review[]; googleReviewsUrl: string | null }) {
  if (!reviews.length && !googleReviewsUrl) return null;
  return (
    <section aria-labelledby="reviews" className="py-24 sm:py-32">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
          <Reveal>
            <SectionHeading id="reviews" eyebrow="Reviews" title="Wat klanten zeggen" />
          </Reveal>
          {googleReviewsUrl ? (
            <ButtonLink href={googleReviewsUrl} variant="secondary" target="_blank" rel="noopener noreferrer">
              Alle reviews op Google
              <ExternalLink className="size-4" aria-hidden />
            </ButtonLink>
          ) : null}
        </div>
        {reviews.length ? (
          <ul className="mt-14 grid gap-5 md:grid-cols-3">
            {reviews.slice(0, 6).map((review, i) => (
              <Reveal as="li" key={review.id} delay={(i % 3) * 100}>
                <figure className="flex h-full flex-col rounded-2xl border border-line bg-surface p-7">
                  <div className="flex items-center justify-between gap-3">
                    <Stars rating={review.rating} />
                    {review.isDemo ? (
                      <span className="rounded-full bg-fuchsia-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-fuchsia-300 uppercase">
                        Voorbeeld
                      </span>
                    ) : null}
                  </div>
                  <blockquote className="mt-5 flex-1 font-display text-xl leading-snug text-ink">
                    “{review.body}”
                  </blockquote>
                  <figcaption className="mt-6 text-sm text-ink-muted">
                    {review.authorName}
                    {review.source ? <span className="text-ink-faint"> · {review.source}</span> : null}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
