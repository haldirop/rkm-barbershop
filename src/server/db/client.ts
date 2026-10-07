import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Anything you can run queries on: the database itself or an open transaction. */
export type DbOrTx = Database | Transaction;

type DatabaseTarget =
  | { kind: "postgres"; url: string }
  | { kind: "pglite"; dataDir: string | undefined };

/**
 * DATABASE_URL decides the driver:
 * - `postgres://…` / `postgresql://…`  → PostgreSQL (production)
 * - `pglite:./.data/pglite` or unset   → embedded PostgreSQL (PGlite) on disk, for local development
 * - `pglite:memory`                    → in-memory PGlite (tests)
 */
export function resolveDatabaseTarget(url = process.env.DATABASE_URL): DatabaseTarget {
  if (url && /^postgres(ql)?:\/\//.test(url)) return { kind: "postgres", url };
  if (process.env.NODE_ENV === "production" && !url) {
    throw new Error("DATABASE_URL ontbreekt. Stel een PostgreSQL-verbinding in voor productie.");
  }
  const raw = url?.startsWith("pglite:") ? url.slice("pglite:".length) : "./.data/pglite";
  return { kind: "pglite", dataDir: raw === "memory" ? undefined : raw };
}

/**
 * Remote databases (Supabase) are always reached over an encrypted connection.
 * With DATABASE_CA_CERT (Supabase: Settings → Database → SSL certificate) the
 * server certificate is verified as well.
 */
function sslOptions(url: string) {
  const host = new URL(url).hostname;
  if (["localhost", "127.0.0.1", "::1"].includes(host) || process.env.DATABASE_SSL === "disable") return false;
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  return ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false };
}

export interface DatabaseHandle {
  db: Database;
  migrate(): Promise<void>;
  close(): Promise<void>;
}

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

export function openDatabase(target = resolveDatabaseTarget()): DatabaseHandle {
  if (target.kind === "postgres") {
    const pool = new Pool({
      connectionString: target.url,
      ssl: sslOptions(target.url),
      // Serverless functions (Vercel) each keep their own small pool; Supabase's pooler does the rest.
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    const db = drizzlePg(pool, { schema });
    return {
      db: db as unknown as Database,
      migrate: () => migratePg(db, { migrationsFolder: MIGRATIONS_FOLDER }),
      close: () => pool.end(),
    };
  }
  if (target.dataDir) mkdirSync(path.dirname(path.resolve(target.dataDir)), { recursive: true });
  const client = new PGlite({ dataDir: target.dataDir, extensions: { btree_gist } });
  const db = drizzlePglite(client, { schema });
  return {
    db: db as unknown as Database,
    migrate: () => migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER }),
    close: () => client.close(),
  };
}

const globalForDb = globalThis as unknown as { __rkmDb?: Database };

/**
 * Lazily created singleton. Stored on globalThis so dev hot-reloads and separate
 * server bundles share one connection (essential for PGlite, which owns its data dir).
 */
export function getDb(): Database {
  globalForDb.__rkmDb ??= openDatabase().db;
  return globalForDb.__rkmDb;
}

/** For tests and scripts: use a specific database instance. */
export function setDb(db: Database | undefined) {
  globalForDb.__rkmDb = db;
}

export { schema };
