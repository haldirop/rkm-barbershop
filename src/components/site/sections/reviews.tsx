import { ExternalLink, PenLine, Star } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { ButtonLink } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { home } from "@/i18n/messages/home";
import { cn } from "@/lib/cn";
import type { Review } from "@/server/db/schema";

function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={label}>
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

export function Reviews({
  reviews,
  googleReviewsUrl,
  googleReviewWriteUrl,
  locale,
}: {
  reviews: Review[];
  googleReviewsUrl: string | null;
  /** Google's "write a review" link; shows a button to leave one. */
  googleReviewWriteUrl: string | null;
  locale: Locale;
}) {
  if (!reviews.length && !googleReviewsUrl && !googleReviewWriteUrl) return null;
  const t = home[locale].reviews;
  return (
    <section aria-labelledby="reviews" className="py-24 sm:py-32">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
          <Reveal>
            <SectionHeading id="reviews" eyebrow={t.eyebrow} title={t.title} />
          </Reveal>
          {googleReviewsUrl || googleReviewWriteUrl ? (
            <div className="flex flex-wrap gap-3">
              {googleReviewWriteUrl ? (
                <ButtonLink href={googleReviewWriteUrl} variant="secondary" target="_blank" rel="noopener noreferrer">
                  <PenLine className="size-4" aria-hidden />
                  {t.write}
                </ButtonLink>
              ) : null}
              {googleReviewsUrl ? (
                <ButtonLink href={googleReviewsUrl} variant="secondary" target="_blank" rel="noopener noreferrer">
                  {t.allOnGoogle}
                  <ExternalLink className="size-4" aria-hidden />
                </ButtonLink>
              ) : null}
            </div>
          ) : null}
        </div>
        {reviews.length ? (
          <ul className="mt-14 grid gap-5 md:grid-cols-3">
            {reviews.slice(0, 6).map((review, i) => (
              <Reveal as="li" key={review.id} delay={(i % 3) * 100}>
                <figure className="flex h-full flex-col rounded-2xl border border-line bg-surface p-7">
                  <div className="flex items-center justify-between gap-3">
                    <Stars rating={review.rating} label={t.stars(review.rating)} />
                    {review.isDemo ? (
                      <span className="rounded-full bg-fuchsia-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-fuchsia-300 uppercase">
                        {t.example}
                      </span>
                    ) : null}
                  </div>
                  <blockquote className="mt-5 flex-1 font-serif text-[1.35rem] leading-snug text-ink italic">
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
        ) : googleReviewWriteUrl ? (
          <p className="mt-6 max-w-xl text-ink-muted">{t.invite}</p>
        ) : null}
      </div>
    </section>
  );
}
