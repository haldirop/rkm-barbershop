import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { authMode, siteUrl } from "@/server/config";
import { getDb } from "@/server/db/client";
import { adminUsers } from "@/server/db/schema";
import { DomainError } from "@/server/services/shared";
import { findAdminByAuthId, linkAdminToAuthUser, recordLogin, toSessionUser, type SessionUser } from "./admins";
import {
  localChangePassword,
  localCurrentUser,
  localRevokeSessions,
  localSetPassword,
  localSignIn,
  localSignOut,
} from "./local";
import { supabaseAdmin, supabaseServer } from "./supabase";
import { authErrorMessage } from "./supabase-client";

export type { SessionUser };

export type AuthResult = { ok: true } | { ok: false; error: string };

const NO_ACCESS = "Dit account heeft geen toegang tot het beheer.";

/** The logged-in administrator for this request, or null. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (authMode() === "local") return localCurrentUser();
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.getClaims();
    const authUserId = data?.claims?.sub;
    if (error || !authUserId) return null;
    const row = await findAdminByAuthId(authUserId);
    return row ? toSessionUser(row) : null;
  } catch (error) {
    console.error("[auth] Sessie controleren mislukt:", error);
    return null;
  }
});

/** Use at the top of every admin page, server action and route handler. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (authMode() === "local") {
    return (await localSignIn(email, password)) ? { ok: true } : { ok: false, error: "Onjuist e-mailadres of wachtwoord." };
  }
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { ok: false, error: authErrorMessage(error) };
  const admin = await linkAdminToAuthUser(data.user);
  if (!admin) {
    await supabase.auth.signOut();
    return { ok: false, error: NO_ACCESS };
  }
  await recordLogin(admin.id);
  return { ok: true };
}

export async function signOut() {
  if (authMode() === "local") return localSignOut();
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
}

export async function changeOwnPassword(
  user: SessionUser,
  current: string,
  next: string,
): Promise<AuthResult & { field?: "current" | "next" }> {
  if (authMode() === "local") {
    return (await localChangePassword(user.id, current, next))
      ? { ok: true }
      : { ok: false, error: "Je huidige wachtwoord klopt niet.", field: "current" };
  }
  const supabase = await supabaseServer();
  const check = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (check.error) {
    return check.error.code === "invalid_credentials"
      ? { ok: false, error: "Je huidige wachtwoord klopt niet.", field: "current" }
      : { ok: false, error: authErrorMessage(check.error) };
  }
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { ok: false, error: authErrorMessage(error), field: "next" };
  // Sign out every other device that still uses the old password.
  await supabase.auth.signOut({ scope: "others" });
  return { ok: true };
}

/** Creates the login for a new administrator. Returns the Supabase user id (null in local mode or when the account already existed). */
export async function createAdminLogin(input: { name: string; email: string; password: string }): Promise<string | null> {
  if (authMode() === "local") return null;
  const admin = supabaseAdmin();
  if (!admin) {
    throw new DomainError(
      "Nieuwe beheerders toevoegen kan pas als SUPABASE_SECRET_KEY is ingesteld. Je kunt ze ook aanmaken in Supabase (Authentication → Users).",
      "NOT_ALLOWED",
    );
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name },
  });
  if (error) {
    // The person already has a Supabase account: they are linked on their first login.
    if (error.code === "email_exists" || error.code === "user_already_exists") return null;
    throw new DomainError(authErrorMessage(error));
  }
  return data.user?.id ?? null;
}

/** Local mode keeps the password in admin_users. */
export async function setLocalPassword(adminId: string, password: string) {
  if (authMode() === "local") await localSetPassword(adminId, password);
}

/** Removes someone's ability to log in (their admin_users row is deleted separately). */
export async function removeAdminLogin(target: { id: string; authUserId: string | null }) {
  if (authMode() === "local") return localRevokeSessions(target.id);
  if (!target.authUserId) return;
  const admin = supabaseAdmin();
  const result = await admin?.auth.admin.deleteUser(target.authUserId);
  if (result?.error) console.error("[auth] Supabase-gebruiker verwijderen mislukt:", result.error.message);
}

/** Sends a password reset e-mail via Supabase. Only for known administrators; never reveals whether an address exists. */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (authMode() === "local") {
    return { ok: false, error: "Wachtwoord herstellen werkt alleen met Supabase. Lokaal: gebruik npm run admin:create." };
  }
  const [admin] = await getDb().select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email));
  if (!admin) return { ok: true };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/bevestigen?next=/admin/wachtwoord-instellen`,
  });
  if (error) {
    console.error("[auth] Herstelmail versturen mislukt:", error.message);
    if (error.status === 429) return { ok: false, error: authErrorMessage(error) };
  }
  return { ok: true };
}

/** Sets a new password for the user who arrived through a reset link. */
export async function setNewPassword(password: string): Promise<AuthResult> {
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  return error ? { ok: false, error: authErrorMessage(error) } : { ok: true };
}

/**
 * Handles the link from a Supabase e-mail (password reset): either a one-time
 * token hash (custom template) or a PKCE code (default template).
 */
export async function completeEmailLink(params: {
  tokenHash: string | null;
  type: string | null;
  code: string | null;
}): Promise<{ ok: true } | { ok: false; reason: "invalid-link" | "no-access" }> {
  if (authMode() === "local") return { ok: false, reason: "invalid-link" };
  const supabase = await supabaseServer();
  const result =
    params.tokenHash && params.type === "recovery"
      ? await supabase.auth.verifyOtp({ type: "recovery", token_hash: params.tokenHash })
      : params.code
        ? await supabase.auth.exchangeCodeForSession(params.code)
        : null;
  if (!result || result.error || !result.data.user) {
    if (result?.error) console.error("[auth] E-maillink ongeldig:", result.error.code ?? result.error.message);
    return { ok: false, reason: "invalid-link" };
  }
  const admin = await linkAdminToAuthUser(result.data.user);
  if (!admin) {
    await supabase.auth.signOut();
    return { ok: false, reason: "no-access" };
  }
  return { ok: true };
}
