import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/server/config";

/** Pages under /admin that work without being logged in. */
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/wachtwoord-vergeten"];

function toLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

/**
 * Runs before /admin and /auth requests.
 * - Supabase: refreshes the login session (cookies) and sends visitors without a session to the login page.
 * - Local development login: only checks that a session cookie exists.
 * Either way this is a first gate only: every admin page and action verifies the
 * session and the admin allowlist again on the server (requireAdmin).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = !pathname.startsWith("/admin") || PUBLIC_ADMIN_PATHS.includes(pathname);
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
  matcher: ["/admin", "/admin/:path*", "/auth/:path*"],
};
