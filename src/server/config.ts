/**
 * All environment configuration in one place. Server-side only: none of these
 * values are ever sent to the browser (no NEXT_PUBLIC_ prefix needed).
 */

function env(...names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

/** Public URL of the website, used in e-mails, SEO and auth redirects. */
export function siteUrl(): string {
  const configured = env("SITE_URL", "NEXT_PUBLIC_SITE_URL");
  if (configured) return configured.replace(/\/$/, "");
  // On Vercel, fall back to the production URL until a custom domain is configured.
  const vercel = env("VERCEL_PROJECT_PRODUCTION_URL");
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export interface SupabaseConfig {
  url: string;
  /** "Publishable key" in the Supabase dashboard (formerly the "anon" key). Not secret. */
  publishableKey: string;
  /** "Secret key" (formerly "service_role"). Only needed to add or remove administrators. */
  secretKey: string | null;
}

export function supabaseConfig(): SupabaseConfig | null {
  const url = env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = env(
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
  if (!url || !publishableKey) return null;
  return {
    url: url.replace(/\/$/, ""),
    publishableKey,
    secretKey: env("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
  };
}

/**
 * How administrators log in:
 * - "supabase": Supabase Auth (production);
 * - "local":    built-in login with passwords in our own database (development and tests).
 */
export function authMode(): "supabase" | "local" {
  return supabaseConfig() ? "supabase" : "local";
}

/** The owner's e-mail address: first administrator and fallback for new-request notifications. */
export function ownerEmail(): string | null {
  return env("ADMIN_EMAIL")?.toLowerCase() ?? null;
}

export interface EmailConfig {
  resendApiKey: string;
  from: string;
}

export function emailConfig(): EmailConfig | null {
  const resendApiKey = env("RESEND_API_KEY");
  const from = env("EMAIL_FROM", "MAIL_FROM");
  return resendApiKey && from ? { resendApiKey, from } : null;
}

export function cronSecret(): string | null {
  const secret = env("CRON_SECRET");
  return secret && secret.length >= 16 ? secret : null;
}
