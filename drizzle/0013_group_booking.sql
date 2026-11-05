ALTER TABLE "appointments" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "guest_name" text;--> statement-breakpoint
CREATE INDEX "appointments_group_idx" ON "appointments" USING btree ("group_id");