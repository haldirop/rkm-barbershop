/**
 * Prepares the database: applies migrations, inserts the starting configuration
 * on a fresh install, and puts the owner (ADMIN_EMAIL) on the admin allowlist.
 * Safe to run repeatedly. Runs automatically before `npm run dev` and on every
 * Vercel deployment (see vercel.json).
 */
import "./env";
import { count } from "drizzle-orm";
import { ensureOwner } from "../src/server/auth/admins";
import { hashPassword, passwordProblem } from "../src/server/auth/password";
import { authMode, ownerEmail } from "../src/server/config";
import { openDatabase, resolveDatabaseTarget } from "../src/server/db/client";
import { adminUsers } from "../src/server/db/schema";
import { seedBaseData } from "../src/server/db/seed";

async function main() {
  const target = resolveDatabaseTarget();
  console.log(
    `• Database: ${target.kind === "postgres" ? "PostgreSQL" : `PGlite (${target.dataDir ?? "geheugen"})`}`,
  );
  console.log(`• Inloggen beheer via: ${authMode() === "supabase" ? "Supabase Auth" : "lokale login (ontwikkeling)"}`);
  const handle = openDatabase(target);
  try {
    await handle.migrate();
    console.log("• Database-structuur is up-to-date");

    if (await seedBaseData(handle.db)) {
      console.log("• Startconfiguratie aangemaakt (diensten, barbers, openingstijden)");
    }

    const email = ownerEmail();
    if (email) {
      let passwordHash: string | undefined;
      const password = process.env.ADMIN_PASSWORD;
      // A password from the environment is only used by the local development login.
      if (authMode() === "local" && password) {
        const problem = passwordProblem(password);
        if (problem) throw new Error(`ADMIN_PASSWORD is niet sterk genoeg: ${problem}`);
        passwordHash = await hashPassword(password);
      }
      const result = await ensureOwner(handle.db, email, { name: process.env.ADMIN_NAME?.trim(), passwordHash });
      if (result !== "exists") console.log(`• Eigenaar toegevoegd aan het beheer: ${email}`);
    } else {
      const [{ total }] = await handle.db.select({ total: count() }).from(adminUsers);
      if (total === 0) console.log("! Nog geen beheerder: stel ADMIN_EMAIL in (zie README).");
    }
  } finally {
    await handle.close();
  }
}

main().catch((error) => {
  console.error("✗ Database-setup mislukt:", error instanceof Error ? error.message : error);
  process.exit(1);
});
