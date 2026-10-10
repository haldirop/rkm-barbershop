-- The day used to be the primary key; a removed count is kept, so a day can have several rows now.
ALTER TABLE "cash_counts" DROP CONSTRAINT "cash_counts_pkey";--> statement-breakpoint
ALTER TABLE "cash_counts" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "cash_counts" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cash_counts" ADD COLUMN "deleted_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "cash_counts" ADD COLUMN "delete_reason" text;--> statement-breakpoint
ALTER TABLE "cash_counts" ADD CONSTRAINT "cash_counts_deleted_by_user_id_admin_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cash_counts_date_key" ON "cash_counts" USING btree ("date") WHERE "cash_counts"."deleted_at" IS NULL;