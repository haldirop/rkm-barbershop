import { eq } from "drizzle-orm";
import { ownerEmail } from "@/server/config";
import { getDb, type DbOrTx } from "@/server/db/client";
import { adminUsers, type AdminUser } from "@/server/db/schema";

/**
 * The admin_users table is the allowlist for /admin. Being able to log in
 * (to Supabase Auth or the local login) is not enough: there must be a row here.
 */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN";
}

export function toSessionUser(row: AdminUser): SessionUser {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

export async function findAdminByAuthId(authUserId: string, db: DbOrTx = getDb()) {
  const [row] = await db.select().from(adminUsers).where(eq(adminUsers.authUserId, authUserId));
  return row ?? null;
}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "Beheerder";
}

/**
 * Finds the administrator for a Supabase Auth user. The first time someone logs
 * in, their row is linked on e-mail address — but only if Supabase confirmed
 * that the address belongs to them. The owner (ADMIN_EMAIL) gets a row automatically.
 */
export async function linkAdminToAuthUser(
  user: { id: string; email?: string | null; email_confirmed_at?: string | null },
  db: DbOrTx = getDb(),
): Promise<AdminUser | null> {
  const linked = await findAdminByAuthId(user.id, db);
  if (linked) return linked;

  const email = user.email?.trim().toLowerCase();
  if (!email || !user.email_confirmed_at) return null;

  // Also re-links when the Supabase account was deleted and recreated: Supabase allows
  // only one account per verified e-mail address, so the address identifies the person.
  const [byEmail] = await db
    .update(adminUsers)
    .set({ authUserId: user.id })
    .where(eq(adminUsers.email, email))
    .returning();
  if (byEmail) return byEmail;

  if (email === ownerEmail()) {
    const [owner] = await db
      .insert(adminUsers)
      .values({ email, name: nameFromEmail(email), role: "OWNER", authUserId: user.id })
      .onConflictDoNothing()
      .returning();
    return owner ?? null;
  }
  return null;
}

/** Makes sure the owner from ADMIN_EMAIL is on the allowlist (used by the setup script). */
export async function ensureOwner(
  db: DbOrTx,
  email: string,
  opts: { name?: string; passwordHash?: string } = {},
): Promise<"created" | "updated" | "exists"> {
  const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
  if (!existing) {
    await db.insert(adminUsers).values({
      email,
      name: opts.name || nameFromEmail(email),
      role: "OWNER",
      passwordHash: opts.passwordHash ?? null,
    });
    return "created";
  }
  if (opts.passwordHash && !existing.passwordHash) {
    await db.update(adminUsers).set({ passwordHash: opts.passwordHash }).where(eq(adminUsers.id, existing.id));
    return "updated";
  }
  return "exists";
}

export async function recordLogin(adminId: string, db: DbOrTx = getDb()) {
  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, adminId));
}
