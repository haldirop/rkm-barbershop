"use client";

import { useActionState } from "react";
import { deleteReviewAction, saveReviewAction } from "@/app/admin/actions/content";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { DeleteButton, FormError, useActionFeedback } from "./form-helpers";

export interface ReviewValues {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  source: string | null;
  isPublished: boolean;
  sortOrder: number;
}

export function ReviewForm({ review }: { review?: ReviewValues }) {
  const [state, action] = useActionState(saveReviewAction, null);
  const formRef = useActionFeedback(state, { resetForm: !review });
  const errors = state?.fieldErrors ?? {};
  const key = review?.id ?? "new";
  return (
    <form ref={formRef} action={action} className="space-y-4">
      <input type="hidden" name="id" value={review?.id ?? ""} />
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <Field label="Naam klant" htmlFor={`author-${key}`} error={errors.authorName}>
          <Input id={`author-${key}`} name="authorName" defaultValue={review?.authorName} placeholder="Bijv. Jan J." required />
        </Field>
        <Field label="Sterren" htmlFor={`rating-${key}`}>
          <Select id={`rating-${key}`} name="rating" defaultValue={String(review?.rating ?? 5)}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)} ({n})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Bron" htmlFor={`source-${key}`} error={errors.source}>
          <Input id={`source-${key}`} name="source" defaultValue={review?.source ?? ""} placeholder="Google" maxLength={40} />
        </Field>
      </div>
      <Field label="Review" htmlFor={`body-${key}`} error={errors.body} hint="Neem alleen echte reviews over, met toestemming of van een openbare bron.">
        <Textarea id={`body-${key}`} name="body" defaultValue={review?.body} maxLength={600} required />
      </Field>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-6">
          <Field label="Volgorde" htmlFor={`sort-${key}`} className="w-24">
            <Input id={`sort-${key}`} name="sortOrder" type="number" min={0} max={999} defaultValue={review?.sortOrder ?? 0} />
          </Field>
          <label className="flex h-12 items-center gap-3 text-sm text-ink-muted">
            <Checkbox name="isPublished" defaultChecked={review?.isPublished ?? true} /> Tonen op de website
          </label>
        </div>
        <div className="flex gap-2">
          {review ? (
            <DeleteButton action={() => deleteReviewAction(review.id)} title="Review verwijderen?" description="De review verdwijnt van de website." />
          ) : null}
          <SubmitButton pendingText="Opslaan…">{review ? "Opslaan" : "Review toevoegen"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
