import "server-only";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { getDb } from "@/server/db/client";
import { adminUsers, sessions } from "@/server/db/schema";
import { randomToken, sha256 } from "@/server/security";
import { burnPasswordCheck, hashPassword, verifyPassword } from "./password";
import { recordLogin, toSessionUser, type SessionUser } from "./admins";

/**
 * Built-in login for development and automated tests, so the project runs
 * without any external account. Production uses Supabase Auth (see supabase.ts).
 * Passwords: Argon2id. Sessions: random token in an httpOnly cookie, SHA-256 hash in the database.
 */

export const LOCAL_SESSION_COOKIE = "rkm_session";
const SESSION_DAYS = 14;

export async function localSignIn(email: string, password: string): Promise<SessionUser | null> {
  const db = getDb();
  const [row] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
  if (!row?.passwordHash) {
    await burnPasswordCheck(password);
    return null;
  }
  if (!(await verifyPassword(row.passwordHash, password))) return null;

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({
    id: sha256(token),
    userId: row.id,
    expiresAt,
    userAgent: (await headers()).get("user-agent")?.slice(0, 300) ?? null,
  });
  await db.delete(sessions).where(and(eq(sessions.userId, row.id), lt(sessions.expiresAt, new Date())));
  await recordLogin(row.id);

  (await cookies()).set(LOCAL_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return toSessionUser(row);
}

export async function localSignOut() {
  const store = await cookies();
  const token = store.get(LOCAL_SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.id, sha256(token)));
  store.delete(LOCAL_SESSION_COOKIE);
}

export async function localCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(LOCAL_SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const [row] = await getDb()
    .select({ user: adminUsers })
    .from(sessions)
    .innerJoin(adminUsers, eq(adminUsers.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())));
  return row ? toSessionUser(row.user) : null;
}

export async function localChangePassword(adminId: string, current: string, next: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, adminId));
  if (!row?.passwordHash || !(await verifyPassword(row.passwordHash, current))) return false;
  await db.update(adminUsers).set({ passwordHash: await hashPassword(next) }).where(eq(adminUsers.id, adminId));
  await db.delete(sessions).where(eq(sessions.userId, adminId));
  await localSignIn(row.email, next);
  return true;
}

export async function localSetPassword(adminId: string, password: string) {
  await getDb()
    .update(adminUsers)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(adminUsers.id, adminId));
}

export async function localRevokeSessions(adminId: string) {
  await getDb().delete(sessions).where(eq(sessions.userId, adminId));
}
