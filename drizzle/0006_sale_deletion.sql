DROP INDEX "sales_refund_of_key";--> statement-breakpoint
DROP INDEX "sales_appointment_key";--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "deleted_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "delete_reason" text;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_deleted_by_user_id_admin_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_refund_of_key" ON "sales" USING btree ("refund_of_id") WHERE "sales"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_appointment_key" ON "sales" USING btree ("appointment_id") WHERE "sales"."kind" = 'SALE' AND "sales"."deleted_at" IS NULL;