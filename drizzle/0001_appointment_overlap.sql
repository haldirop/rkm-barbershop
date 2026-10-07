-- Double bookings are impossible at database level: two active appointments
-- (PENDING or APPROVED) for the same barber may never overlap in time.
-- The application performs the same check (including buffer time) inside a
-- locked transaction; this constraint is the last line of defence.
--
-- On Supabase, extensions belong in the "extensions" schema; elsewhere the default schema is used.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
    CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
  ELSE
    CREATE EXTENSION IF NOT EXISTS btree_gist;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (
    "barber_id" WITH =,
    tsrange("date" + "start_time", "date" + "end_time", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING', 'APPROVED'));
