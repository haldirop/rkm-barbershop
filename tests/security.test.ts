import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openDatabase, type DatabaseHandle } from "@/server/db/client";
import { seedBaseData } from "@/server/db/seed";

/**
 * Supabase exposes the "public" schema through its Data API to the roles anon
 * (visitors with the publishable key) and authenticated (logged-in users).
 * This test recreates those roles the way Supabase sets them up, runs our
 * migrations, and checks that neither role can read or change anything.
 */
let handle: DatabaseHandle;

async function asRole<T>(role: "anon" | "authenticated", query: () => Promise<T>): Promise<T> {
  await handle.db.execute(sql.raw(`SET ROLE ${role}`));
  try {
    return await query();
  } finally {
    await handle.db.execute(sql`RESET ROLE`);
  }
}

/** Rows of a raw query (the generic database type does not know their shape). */
async function rows<T>(query: Promise<unknown>): Promise<T[]> {
  return ((await query) as { rows: T[] }).rows;
}

/** Asserts that Postgres refused the query (drizzle wraps the original error in .cause). */
async function expectDenied(query: Promise<unknown>) {
  const error = await query.then(
    () => null,
    (e: Error & { cause?: Error }) => e,
  );
  expect(error?.cause?.message ?? error?.message).toMatch(/permission denied/);
}

beforeAll(async () => {
  handle = openDatabase({ kind: "pglite", dataDir: undefined });
  // Like a fresh Supabase project: API roles that get access to new tables by default.
  for (const statement of [
    "CREATE ROLE anon NOLOGIN",
    "CREATE ROLE authenticated NOLOGIN",
    "GRANT USAGE ON SCHEMA public TO anon, authenticated",
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated",
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated",
  ]) {
    await handle.db.execute(sql.raw(statement));
  }
  await handle.migrate();
  await seedBaseData(handle.db);
});

afterAll(() => handle.close());

describe("database security (Row Level Security)", () => {
  it("has RLS enabled on every table", async () => {
    const tables = await rows<{ relname: string; relrowsecurity: boolean }>(handle.db.execute(sql`
      SELECT c.relname, c.relrowsecurity FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'`));
    expect(tables.length).toBeGreaterThan(10);
    expect(tables.filter((t) => !t.relrowsecurity).map((t) => t.relname)).toEqual([]);
  });

  it.each(["anon", "authenticated"] as const)("refuses %s access to customer and appointment data", async (role) => {
    for (const table of ["appointments", "customers", "admin_users", "sessions", "settings"]) {
      await expectDenied(asRole(role, () => handle.db.execute(sql.raw(`SELECT * FROM ${table}`))));
    }
    await expectDenied(asRole(role, () => handle.db.execute(sql`UPDATE appointments SET status = 'APPROVED'`)));
  });

  it("still shows nothing if someone ever grants the API roles access by mistake", async () => {
    await handle.db.execute(sql`GRANT SELECT ON customers, services TO anon`);
    const services = await rows(asRole("anon", () => handle.db.execute(sql`SELECT * FROM services`)));
    expect(services).toHaveLength(0); // RLS without a policy: no rows
    await handle.db.execute(sql`REVOKE SELECT ON customers, services FROM anon`);
  });

  it("lets the server (table owner) work normally", async () => {
    const services = await rows(handle.db.execute(sql`SELECT * FROM services`));
    expect(services.length).toBeGreaterThan(0);
  });
});
