import { NextResponse, type NextRequest } from "next/server";
import { completeEmailLink } from "@/server/auth/session";

/** Only allow redirects to our own admin pages (no open redirects). */
function safeNext(value: string | null): string {
  return value && /^\/admin(\/[a-z0-9-]*)*$/.test(value) ? value : "/admin";
}

/**
 * GET /auth/bevestigen — target of the links in Supabase Auth e-mails
 * (currently: password reset). Logs the person in and continues to `next`.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"));
  let result;
  try {
    result = await completeEmailLink({
      tokenHash: params.get("token_hash"),
      type: params.get("type"),
      code: params.get("code"),
    });
  } catch (error) {
    console.error("[auth] E-maillink verwerken mislukt:", error);
    result = { ok: false as const, reason: "invalid-link" as const };
  }

  const target = request.nextUrl.clone();
  target.search = "";
  if (result.ok) {
    target.pathname = next;
  } else {
    target.pathname = "/admin/login";
    target.searchParams.set("melding", result.reason);
  }
  return NextResponse.redirect(target);
}
