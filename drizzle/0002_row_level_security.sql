-- Row Level Security for Supabase.
--
-- The website never lets a browser talk to the database directly: every read and
-- write goes through the server, which connects as the table owner. Supabase,
-- however, also exposes the "public" schema through its Data API to anyone who
-- has the project's publishable/anon key. To make that API useless for anyone
-- outside the server:
--   1. RLS is enabled on every table, without any policy  → anon/authenticated see 0 rows;
--   2. all privileges of the anon/authenticated roles are revoked → requests are refused outright;
--   3. future tables don't get those privileges by default either.
-- The table owner (the server connection) is not affected by RLS.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
  END IF;
END $$;
