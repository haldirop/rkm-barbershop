ALTER TABLE "availability_alerts" ADD COLUMN "last_error" text;--> statement-breakpoint
-- Until now a sign-up was marked as notified even when the "plek vrij" e-mail failed
-- (e.g. Resend refused it). Put those back on the list so the next check tries again.
UPDATE "availability_alerts" AS a
SET "notified_at" = NULL, "last_error" = l."error"
FROM "email_log" AS l
WHERE a."notified_at" IS NOT NULL
  AND l."template" = 'availabilityAlert'
  AND l."recipient" = a."email"
  AND l."status" = 'FAILED'
  AND l."created_at" BETWEEN a."notified_at" - interval '1 minute' AND a."notified_at" + interval '5 minutes'
  AND NOT EXISTS (
    SELECT 1 FROM "email_log" AS ok
    WHERE ok."template" = 'availabilityAlert'
      AND ok."recipient" = a."email"
      AND ok."status" <> 'FAILED'
      AND ok."created_at" BETWEEN a."notified_at" - interval '1 minute' AND a."notified_at" + interval '5 minutes'
  );
