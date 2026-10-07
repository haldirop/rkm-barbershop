/**
 * Creates an administrator or resets their password:
 *   npm run admin:create -- naam@voorbeeld.nl "Volledige naam"
 * A strong temporary password is generated and shown once; change it after logging in.
 * With Supabase configured, the login is created in Supabase Auth (needs SUPABASE_SECRET_KEY).
 */
import "./env";
import { randomBytes } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { hashPassword } from "../src/server/auth/password";
import { createSupabaseAdminClient } from "../src/server/auth/supabase-client";
import { supabaseConfig } from "../src/server/config";
import { openDatabase } from "../src/server/db/client";
import { adminUsers, sessions } from "../src/server/db/schema";

async function main() {
  const [emailArg, nameArg] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Gebruik: npm run admin:create -- naam@voorbeeld.nl "Volledige naam"');
    process.exit(1);
  }
  const password = `${randomBytes(12).toString("base64url")}7a`;
  const supabase = supabaseConfig();
  const handle = openDatabase();
  try {
    const db = handle.db;
    const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    const [{ total }] = await db.select({ total: count() }).from(adminUsers);
    let authUserId = existing?.authUserId ?? null;

    if (supabase) {
      const admin = createSupabaseAdminClient(supabase);
      if (!admin) throw new Error("SUPABASE_SECRET_KEY ontbreekt.");
      if (authUserId) {
        const { error } = await admin.auth.admin.updateUserById(authUserId, { password });
        if (error) throw error;
      } else {
        const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        if (error) throw new Error(`${error.message} — bestaat het account al? Gebruik dan ‘Wachtwoord vergeten’.`);
        authUserId = data.user.id;
      }
    }

    const passwordHash = supabase ? null : await hashPassword(password);
    if (existing) {
      await db.update(adminUsers).set({ authUserId, passwordHash }).where(eq(adminUsers.id, existing.id));
      await db.delete(sessions).where(eq(sessions.userId, existing.id));
      console.log(`• Wachtwoord opnieuw ingesteld voor ${email}`);
    } else {
      await db.insert(adminUsers).values({
        email,
        name: nameArg?.trim() || "Beheerder",
        role: total === 0 ? "OWNER" : "ADMIN",
        authUserId,
        passwordHash,
      });
      console.log(`• Beheerder aangemaakt: ${email}`);
    }
    console.log(`• Tijdelijk wachtwoord: ${password}`);
    console.log("  Wijzig dit direct na het inloggen via Beheer → Instellingen.");
  } finally {
    await handle.close();
  }
}

main().catch((error) => {
  console.error("✗ Mislukt:", error instanceof Error ? error.message : error);
  process.exit(1);
});
