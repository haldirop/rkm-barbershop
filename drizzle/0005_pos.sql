CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'CARD', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."sale_kind" AS ENUM('SALE', 'REFUND');--> statement-breakpoint
CREATE TYPE "public"."sale_line_kind" AS ENUM('SERVICE', 'PRODUCT');--> statement-breakpoint
CREATE TABLE "cash_counts" (
	"date" date PRIMARY KEY NOT NULL,
	"float_cents" integer DEFAULT 0 NOT NULL,
	"cash_sales_cents" integer NOT NULL,
	"counted_cents" integer NOT NULL,
	"note" text,
	"counted_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer NOT NULL,
	"vat_rate" smallint DEFAULT 21 NOT NULL,
	"stock" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_chk" CHECK ("products"."price_cents" >= 0),
	CONSTRAINT "products_vat_chk" CHECK ("products"."vat_rate" IN (0, 9, 21))
);
--> statement-breakpoint
CREATE TABLE "sale_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"kind" "sale_line_kind" NOT NULL,
	"service_id" uuid,
	"product_id" uuid,
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"vat_rate" smallint NOT NULL,
	"total_cents" integer NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"vat_cents" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer NOT NULL,
	"kind" "sale_kind" DEFAULT 'SALE' NOT NULL,
	"refund_of_id" uuid,
	"date" date NOT NULL,
	"appointment_id" uuid,
	"customer_id" uuid,
	"barber_id" uuid,
	"barber_name" text,
	"payment_method" "payment_method" NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"tip_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"note" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_refund_chk" CHECK (("sales"."kind" = 'REFUND') = ("sales"."refund_of_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "vat_rate" smallint DEFAULT 9 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "vat_number" text;--> statement-breakpoint
ALTER TABLE "cash_counts" ADD CONSTRAINT "cash_counts_counted_by_user_id_admin_users_id_fk" FOREIGN KEY ("counted_by_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_refund_of_id_sales_id_fk" FOREIGN KEY ("refund_of_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_user_id_admin_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sale_lines_sale_idx" ON "sale_lines" USING btree ("sale_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_number_key" ON "sales" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_refund_of_key" ON "sales" USING btree ("refund_of_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_appointment_key" ON "sales" USING btree ("appointment_id") WHERE "sales"."kind" = 'SALE';--> statement-breakpoint
CREATE INDEX "sales_date_idx" ON "sales" USING btree ("date");--> statement-breakpoint
CREATE INDEX "sales_customer_idx" ON "sales" USING btree ("customer_id");--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_vat_chk" CHECK ("services"."vat_rate" IN (0, 9, 21));--> statement-breakpoint
-- Same protection as every other table (see 0002_row_level_security.sql): no access via Supabase's Data API.
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sales" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sale_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cash_counts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.products, public.sales, public.sale_lines, public.cash_counts FROM anon, authenticated;
  END IF;
END $$;
