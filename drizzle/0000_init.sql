CREATE TYPE "public"."actor_type" AS ENUM('CUSTOMER', 'ADMIN', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."appointment_source" AS ENUM('ONLINE', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('SENT', 'LOGGED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('OWNER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"auth_user_id" uuid,
	"password_hash" text,
	"role" "user_role" DEFAULT 'ADMIN' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"type" text NOT NULL,
	"actor" "actor_type" NOT NULL,
	"actor_user_id" uuid,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"barber_id" uuid,
	"service_id" uuid,
	"barber_name" text NOT NULL,
	"service_name" text NOT NULL,
	"price_cents" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"status" "appointment_status" DEFAULT 'PENDING' NOT NULL,
	"any_barber" boolean DEFAULT false NOT NULL,
	"notes" text,
	"admin_notes" text,
	"status_reason" text,
	"source" "appointment_source" DEFAULT 'ONLINE' NOT NULL,
	"cancelled_by" "actor_type",
	"status_changed_at" timestamp with time zone,
	"reminder_sent_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_range_chk" CHECK ("appointments"."end_time" > "appointments"."start_time")
);
--> statement-breakpoint
CREATE TABLE "barber_working_hours" (
	"barber_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"is_working" boolean DEFAULT true NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	CONSTRAINT "barber_working_hours_barber_id_weekday_pk" PRIMARY KEY("barber_id","weekday"),
	CONSTRAINT "barber_hours_weekday_chk" CHECK ("barber_working_hours"."weekday" BETWEEN 1 AND 7),
	CONSTRAINT "barber_hours_range_chk" CHECK ("barber_working_hours"."end_time" > "barber_working_hours"."start_time")
);
--> statement-breakpoint
CREATE TABLE "barbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"bio" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocked_times" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barber_id" uuid,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocked_times_dates_chk" CHECK ("blocked_times"."end_date" >= "blocked_times"."start_date"),
	CONSTRAINT "blocked_times_times_chk" CHECK (("blocked_times"."start_time" IS NULL AND "blocked_times"."end_time" IS NULL) OR ("blocked_times"."start_time" IS NOT NULL AND "blocked_times"."end_time" IS NOT NULL AND "blocked_times"."end_time" > "blocked_times"."start_time"))
);
--> statement-breakpoint
CREATE TABLE "breaks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"label" text,
	"barber_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "breaks_weekday_chk" CHECK ("breaks"."weekday" BETWEEN 1 AND 7),
	CONSTRAINT "breaks_range_chk" CHECK ("breaks"."end_time" > "breaks"."start_time")
);
--> statement-breakpoint
CREATE TABLE "business_hours" (
	"weekday" smallint PRIMARY KEY NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"open_time" time NOT NULL,
	"close_time" time NOT NULL,
	CONSTRAINT "business_hours_weekday_chk" CHECK ("business_hours"."weekday" BETWEEN 1 AND 7),
	CONSTRAINT "business_hours_range_chk" CHECK ("business_hours"."close_time" > "business_hours"."open_time")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text NOT NULL,
	"preferred_barber_id" uuid,
	"admin_notes" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid,
	"template" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"status" "email_status" NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_name" text NOT NULL,
	"rating" smallint NOT NULL,
	"body" text NOT NULL,
	"source" text,
	"is_published" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_chk" CHECK ("reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_price_chk" CHECK ("services"."price_cents" >= 0),
	CONSTRAINT "services_duration_chk" CHECK ("services"."duration_minutes" BETWEEN 5 AND 480)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"business_name" text DEFAULT 'RKM Barbershop' NOT NULL,
	"tagline" text DEFAULT 'Strak geknipt. Zelfverzekerd naar buiten.' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"street" text DEFAULT '' NOT NULL,
	"postal_code" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"instagram_url" text,
	"facebook_url" text,
	"google_reviews_url" text,
	"kvk_number" text,
	"notification_email" text,
	"slot_interval_minutes" integer DEFAULT 15 NOT NULL,
	"buffer_minutes" integer DEFAULT 0 NOT NULL,
	"min_lead_minutes" integer DEFAULT 60 NOT NULL,
	"booking_horizon_days" integer DEFAULT 60 NOT NULL,
	"cancellation_cutoff_hours" integer DEFAULT 24 NOT NULL,
	"reminders_enabled" boolean DEFAULT true NOT NULL,
	"reminder_send_time" time DEFAULT '17:00' NOT NULL,
	"max_open_appointments_per_customer" integer DEFAULT 3 NOT NULL,
	"details_confirmed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_singleton_chk" CHECK ("settings"."id" = 1),
	CONSTRAINT "settings_interval_chk" CHECK ("settings"."slot_interval_minutes" IN (5, 10, 15, 20, 30, 60))
);
--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_actor_user_id_admin_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barber_working_hours" ADD CONSTRAINT "barber_working_hours_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breaks" ADD CONSTRAINT "breaks_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_preferred_barber_id_barbers_id_fk" FOREIGN KEY ("preferred_barber_id") REFERENCES "public"."barbers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_auth_user_key" ON "admin_users" USING btree ("auth_user_id");--> statement-breakpoint
CREATE INDEX "appointment_events_appointment_idx" ON "appointment_events" USING btree ("appointment_id","created_at");--> statement-breakpoint
CREATE INDEX "appointments_date_idx" ON "appointments" USING btree ("date","start_time");--> statement-breakpoint
CREATE INDEX "appointments_status_idx" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "appointments_customer_idx" ON "appointments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "appointments_barber_date_idx" ON "appointments" USING btree ("barber_id","date");--> statement-breakpoint
CREATE INDEX "blocked_times_dates_idx" ON "blocked_times" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_email_key" ON "customers" USING btree ("email") WHERE "customers"."email" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "email_log_appointment_idx" ON "email_log" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "rate_limit_events_key_idx" ON "rate_limit_events" USING btree ("key","created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");