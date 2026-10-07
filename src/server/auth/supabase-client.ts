import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { createClient, isAuthError, isAuthRetryableFetchError } from "@supabase/supabase-js";
import type { SupabaseConfig } from "@/server/config";

/**
 * Supabase clients without Next.js dependencies (so they can be tested).
 * - The auth client acts on behalf of the visitor and keeps the session in cookies.
 * - The admin client uses the secret key; it may only ever run on the server.
 */

export function createSupabaseAuthClient(config: SupabaseConfig, cookies: CookieMethodsServer) {
  return createServerClient(config.url, config.publishableKey, { cookies });
}

export type SupabaseAuthClient = ReturnType<typeof createSupabaseAuthClient>;

export function createSupabaseAdminClient(config: SupabaseConfig) {
  if (!config.secretKey) return null;
  return createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

const MESSAGES: Record<string, string> = {
  invalid_credentials: "Onjuist e-mailadres of wachtwoord.",
  email_not_confirmed: "Bevestig eerst je e-mailadres via de link in je mailbox.",
  user_banned: "Dit account is geblokkeerd.",
  weak_password: "Dit wachtwoord is te zwak. Kies een langer wachtwoord met letters en cijfers.",
  same_password: "Kies een ander wachtwoord dan je huidige wachtwoord.",
  reauthentication_needed: "Log opnieuw in en probeer het daarna nog eens.",
  otp_expired: "Deze link is verlopen of al gebruikt. Vraag een nieuwe aan.",
  flow_state_not_found: "Deze link werkt niet (meer). Open de link in dezelfde browser of vraag een nieuwe aan.",
  flow_state_expired: "Deze link is verlopen. Vraag een nieuwe aan.",
  email_exists: "Er bestaat al een account met dit e-mailadres.",
  user_already_exists: "Er bestaat al een account met dit e-mailadres.",
};

/** Turns any Supabase Auth error into a short, non-technical Dutch message. */
export function authErrorMessage(error: unknown): string {
  if (isAuthRetryableFetchError(error)) {
    return "De inlogdienst is tijdelijk niet bereikbaar. Probeer het over een paar minuten opnieuw.";
  }
  if (isAuthError(error)) {
    if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
    if (error.status === 429 || error.code?.startsWith("over_")) {
      return "Te veel pogingen. Probeer het over een paar minuten opnieuw.";
    }
  }
  return "Er ging iets mis. Probeer het opnieuw.";
}
