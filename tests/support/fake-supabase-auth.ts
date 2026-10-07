/**
 * Minimal stand-in for the Supabase Auth (GoTrue) HTTP API, used to test our
 * Supabase login code with the real supabase-js / @supabase/ssr libraries
 * without a Supabase account or Docker. Implements only the endpoints we use.
 * Tokens are HS256 JWTs, so supabase-js validates them via GET /user (like
 * Supabase projects that use the legacy JWT secret).
 */
import { createHmac, randomUUID } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";

const JWT_SECRET = "fake-supabase-test-secret";

interface FakeUser {
  id: string;
  email: string;
  password: string;
  confirmed: boolean;
  metadata: Record<string, unknown>;
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function signJwt(payload: Record<string, unknown>) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const signature = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyJwt(token: string): Record<string, unknown> | null {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return null;
  const expected = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  if (expected !== signature) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString());
  return payload.exp * 1000 > Date.now() ? payload : null;
}

export async function startFakeSupabaseAuth(keys: { publishableKey: string; secretKey: string; port?: number }) {
  const users = new Map<string, FakeUser>();
  const refreshTokens = new Map<string, string>();
  const recoveryTokens = new Map<string, string>();
  const revoked = new Set<string>();
  const requests: string[] = [];

  const userJson = (u: FakeUser) => ({
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: u.confirmed ? "2026-01-01T00:00:00Z" : null,
    phone: "",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: u.metadata,
    identities: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    is_anonymous: false,
  });

  const session = (u: FakeUser) => {
    const now = Math.floor(Date.now() / 1000);
    const sessionId = randomUUID();
    const refresh = randomUUID();
    refreshTokens.set(refresh, u.id);
    return {
      access_token: signJwt({
        sub: u.id,
        email: u.email,
        role: "authenticated",
        aud: "authenticated",
        session_id: sessionId,
        aal: "aal1",
        iat: now,
        exp: now + 3600,
        is_anonymous: false,
      }),
      token_type: "bearer",
      expires_in: 3600,
      expires_at: now + 3600,
      refresh_token: refresh,
      user: userJson(u),
    };
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString() || "{}") : {};
    const send = (status: number, data?: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json", "X-Supabase-Api-Version": "2024-01-01" });
      res.end(data === undefined ? "" : JSON.stringify(data));
    };
    const fail = (status: number, code: string, message: string) =>
      send(status, { code, error_code: code, message, msg: message });
    const bearer = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
    const path = url.pathname.replace(/^\/auth\/v1/, "");
    requests.push(`${req.method} ${path}`);

    if (req.headers.apikey !== keys.publishableKey && req.headers.apikey !== keys.secretKey) {
      return fail(401, "no_authorization", "Invalid API key");
    }

    if (req.method === "POST" && path === "/token") {
      const grant = url.searchParams.get("grant_type");
      if (grant === "password") {
        const user = [...users.values()].find((u) => u.email === body.email && u.password === body.password);
        if (!user) return fail(400, "invalid_credentials", "Invalid login credentials");
        if (!user.confirmed) return fail(400, "email_not_confirmed", "Email not confirmed");
        return send(200, session(user));
      }
      if (grant === "refresh_token") {
        const userId = refreshTokens.get(body.refresh_token);
        refreshTokens.delete(body.refresh_token);
        const user = userId ? users.get(userId) : undefined;
        return user ? send(200, session(user)) : fail(400, "refresh_token_not_found", "Invalid Refresh Token");
      }
    }

    if (path === "/user") {
      const claims = verifyJwt(bearer);
      const user = claims && !revoked.has(String(claims.session_id)) ? users.get(String(claims.sub)) : undefined;
      if (!user) return fail(401, "bad_jwt", "invalid JWT");
      if (req.method === "PUT" && body.password) user.password = body.password;
      return send(200, userJson(user));
    }

    if (req.method === "POST" && path === "/logout") {
      const claims = verifyJwt(bearer);
      if (claims) revoked.add(String(claims.session_id));
      return send(204);
    }

    if (req.method === "POST" && path === "/recover") {
      const user = [...users.values()].find((u) => u.email === body.email);
      if (user) recoveryTokens.set(`hash-${user.id}`, user.id);
      return send(200, {});
    }

    if (req.method === "POST" && path === "/verify") {
      const userId = recoveryTokens.get(body.token_hash);
      recoveryTokens.delete(body.token_hash);
      const user = userId ? users.get(userId) : undefined;
      return user ? send(200, session(user)) : fail(403, "otp_expired", "Email link is invalid or has expired");
    }

    if (path.startsWith("/admin/users")) {
      if (bearer !== keys.secretKey) return fail(403, "not_admin", "User not allowed");
      if (req.method === "POST") {
        if ([...users.values()].some((u) => u.email === body.email)) {
          return fail(422, "email_exists", "A user with this email address has already been registered");
        }
        const user: FakeUser = {
          id: randomUUID(),
          email: body.email,
          password: body.password,
          confirmed: Boolean(body.email_confirm),
          metadata: body.user_metadata ?? {},
        };
        users.set(user.id, user);
        return send(200, userJson(user));
      }
      if (req.method === "DELETE") {
        const id = path.split("/").pop()!;
        users.delete(id);
        return send(200, {});
      }
    }

    // Test helper (not part of Supabase): the token from the last password-reset e-mail.
    if (req.method === "GET" && path === "/debug/recovery-token") {
      const user = [...users.values()].find((u) => u.email === url.searchParams.get("email"));
      const token = user ? `hash-${user.id}` : null;
      return token && recoveryTokens.has(token) ? send(200, { token }) : fail(404, "not_found", "No reset requested");
    }

    if (path === "/.well-known/jwks.json") return send(200, { keys: [] });
    return fail(404, "not_found", `Not implemented: ${req.method} ${path}`);
  });

  await new Promise<void>((resolve) => server.listen(keys.port ?? 0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    addUser(email: string, password: string, confirmed = true) {
      const user: FakeUser = { id: randomUUID(), email, password, confirmed, metadata: {} };
      users.set(user.id, user);
      return user;
    },
    getUserByEmail: (email: string) => [...users.values()].find((u) => u.email === email),
    recoveryTokenFor: (email: string) => {
      const user = [...users.values()].find((u) => u.email === email);
      return user ? `hash-${user.id}` : null;
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

export type FakeSupabaseAuth = Awaited<ReturnType<typeof startFakeSupabaseAuth>>;
