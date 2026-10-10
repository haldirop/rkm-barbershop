CREATE TABLE "availability_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"service_id" uuid NOT NULL,
	"barber_id" uuid,
	"email" text NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_alerts_unique" UNIQUE NULLS NOT DISTINCT("date","service_id","barber_id","email")
);
--> statement-breakpoint
ALTER TABLE "availability_alerts" ADD CONSTRAINT "availability_alerts_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_alerts" ADD CONSTRAINT "availability_alerts_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_alerts_date_idx" ON "availability_alerts" USING btree ("date");--> statement-breakpoint
-- Same protection as every other table (see 0002_row_level_security.sql): no access via Supabase's Data API.
ALTER TABLE "availability_alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.availability_alerts FROM anon, authenticated;
  END IF;
END $$;
