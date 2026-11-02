import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isLocale,
  localizePath,
  resolvePublicPath,
} from "@/i18n/config";
import { supabaseConfig } from "@/server/config";

/** Pages under /admin that work without being logged in. */
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/wachtwoord-vergeten"];

function toLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  const fromTill = url.pathname.startsWith("/kassa");
  url.pathname = "/admin/login";
  url.search = fromTill ? "?naar=/kassa" : "";
  return NextResponse.redirect(url);
}

/**
 * Public pages: /behandelingen, /en/treatments and /de/leistungen all live in
 * app/(site)/[locale]/behandelingen. The page is served under its public address, with the
 * language in a request header for <html lang>. A language picked with the language switch
 * (cookie) is remembered: Dutch addresses then lead to that language. Nothing is decided
 * from the browser language — the site only suggests it (components/site/language-hint.tsx).
 */
function sitePage(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = resolvePublicPath(pathname);
  if (match.kind === "redirect") {
    const url = request.nextUrl.clone();
    url.pathname = match.to;
    return NextResponse.redirect(url, 308);
  }

  const chosen = request.cookies.get(LOCALE_COOKIE)?.value;
  const isPageLoad = request.method === "GET" && !request.headers.has("next-action");
  if (match.locale === DEFAULT_LOCALE && isLocale(chosen) && chosen !== DEFAULT_LOCALE && isPageLoad) {
    const url = request.nextUrl.clone();
    url.pathname = localizePath(pathname, chosen);
    return NextResponse.redirect(url, 307);
  }

  const url = request.nextUrl.clone();
  url.pathname = match.internal;
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, match.locale);
  return NextResponse.rewrite(url, { request: { headers } });
}

/**
 * Runs before every page request.
 * - Public pages: language routing (see sitePage).
 * - /admin, /kassa and /auth: the login gate below.
 * - Supabase: refreshes the login session (cookies) and sends visitors without a session to the login page.
 * - Local development login: only checks that a session cookie exists.
 * Either way this is a first gate only: every admin page and action verifies the
 * session and the admin allowlist again on the server (requireAdmin).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!/^\/(admin|kassa|auth)(\/|$)/.test(pathname)) return sitePage(request);
  const isProtected = pathname.startsWith("/admin") || pathname.startsWith("/kassa");
  const isPublic = !isProtected || PUBLIC_ADMIN_PATHS.includes(pathname);
  const config = supabaseConfig();

  if (!config) {
    if (isPublic || request.cookies.has("rkm_session")) return NextResponse.next();
    return toLogin(request);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Validates the session and refreshes the tokens when needed.
  let loggedIn = false;
  try {
    const { data } = await supabase.auth.getClaims();
    loggedIn = Boolean(data?.claims);
  } catch (error) {
    console.error("[proxy] Sessie controleren mislukt:", error);
  }
  if (!loggedIn && !isPublic) return toLogin(request);
  return response;
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/kassa",
    "/kassa/:path*",
    "/auth/:path*",
    // Public pages; not Next.js internals, the API, files in public/ or the generated icons and feeds.
    "/((?!_next/|api/|admin|kassa|auth|brand/|favicon|icon|apple-icon|opengraph-image|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest).*)",
  ],
};
