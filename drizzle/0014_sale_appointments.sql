CREATE TABLE "sale_appointments" (
	"sale_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	CONSTRAINT "sale_appointments_sale_id_appointment_id_pk" PRIMARY KEY("sale_id","appointment_id")
);
--> statement-breakpoint
ALTER TABLE "sale_appointments" ADD CONSTRAINT "sale_appointments_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_appointments" ADD CONSTRAINT "sale_appointments_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sale_appointments_appointment_idx" ON "sale_appointments" USING btree ("appointment_id");--> statement-breakpoint
-- Like every table: no access through Supabase's public API, only through the app's server.
ALTER TABLE "sale_appointments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Existing receipts for an appointment: the same link in the new table.
INSERT INTO "sale_appointments" ("sale_id", "appointment_id")
SELECT "id", "appointment_id" FROM "sales" WHERE "appointment_id" IS NOT NULL AND "kind" = 'SALE'
ON CONFLICT DO NOTHING;
