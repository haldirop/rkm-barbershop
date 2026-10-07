import type { CookieMethodsServer } from "@supabase/ssr";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { linkAdminToAuthUser } from "@/server/auth/admins";
import { authErrorMessage, createSupabaseAdminClient, createSupabaseAuthClient } from "@/server/auth/supabase-client";
import type { SupabaseConfig } from "@/server/config";
import { openDatabase, type DatabaseHandle } from "@/server/db/client";
import { adminUsers } from "@/server/db/schema";
import { startFakeSupabaseAuth, type FakeSupabaseAuth } from "./support/fake-supabase-auth";

/** A browser's cookie store, as seen by @supabase/ssr. */
function cookieJar() {
  const store = new Map<string, string>();
  const methods: CookieMethodsServer = {
    getAll: () => [...store].map(([name, value]) => ({ name, value })),
    setAll: (list) => {
      for (const { name, value, options } of list) {
        if (!value || options?.maxAge === 0) store.delete(name);
        else store.set(name, value);
      }
    },
  };
  return { store, methods };
}

let fake: FakeSupabaseAuth;
let config: SupabaseConfig;
let handle: DatabaseHandle;

beforeAll(async () => {
  fake = await startFakeSupabaseAuth({ publishableKey: "sb_publishable_test", secretKey: "sb_secret_test" });
  config = { url: fake.url, publishableKey: "sb_publishable_test", secretKey: "sb_secret_test" };
  handle = openDatabase({ kind: "pglite", dataDir: undefined });
  await handle.migrate();
  process.env.ADMIN_EMAIL = "eigenaar@rkm.test";
});

afterAll(async () => {
  delete process.env.ADMIN_EMAIL;
  await handle.close();
  await fake.close();
});

describe("Supabase Auth session in cookies", () => {
  it("logs in, keeps the session in cookies and validates it on the next request", async () => {
    const user = fake.addUser("kapper@rkm.test", "Geheim-wachtwoord-1");
    const browser = cookieJar();

    const login = createSupabaseAuthClient(config, browser.methods);
    const { error } = await login.auth.signInWithPassword({ email: "kapper@rkm.test", password: "Geheim-wachtwoord-1" });
    expect(error).toBeNull();
    expect([...browser.store.keys()].some((name) => name.startsWith("sb-"))).toBe(true);

    const nextRequest = createSupabaseAuthClient(config, browser.methods);
    const { data } = await nextRequest.auth.getClaims();
    expect(data?.claims.sub).toBe(user.id);

    await nextRequest.auth.signOut();
    const afterLogout = createSupabaseAuthClient(config, browser.methods);
    const { data: gone } = await afterLogout.auth.getClaims();
    expect(gone?.claims ?? null).toBeNull();
  });

  it("rejects a wrong password with a Dutch message", async () => {
    fake.addUser("iemand@rkm.test", "Juist-wachtwoord-1");
    const client = createSupabaseAuthClient(config, cookieJar().methods);
    const { error } = await client.auth.signInWithPassword({ email: "iemand@rkm.test", password: "fout" });
    expect(error?.code).toBe("invalid_credentials");
    expect(authErrorMessage(error)).toBe("Onjuist e-mailadres of wachtwoord.");
  });

  it("has no session for a forged cookie", async () => {
    const browser = cookieJar();
    browser.store.set(
      "sb-127-auth-token",
      `base64-${Buffer.from(JSON.stringify({ access_token: "a.b.c", refresh_token: "x", expires_at: 9999999999 })).toString("base64url")}`,
    );
    const client = createSupabaseAuthClient(config, browser.methods);
    const { data } = await client.auth.getClaims();
    expect(data?.claims ?? null).toBeNull();
  });

  it("logs in through a password-reset link (token hash)", async () => {
    fake.addUser("vergeten@rkm.test", "Oud-wachtwoord-1");
    const client = createSupabaseAuthClient(config, cookieJar().methods);
    await client.auth.resetPasswordForEmail("vergeten@rkm.test");
    const { data, error } = await client.auth.verifyOtp({
      type: "recovery",
      token_hash: fake.recoveryTokenFor("vergeten@rkm.test")!,
    });
    expect(error).toBeNull();
    expect(data.user?.email).toBe("vergeten@rkm.test");
    const update = await client.auth.updateUser({ password: "Nieuw-wachtwoord-2" });
    expect(update.error).toBeNull();
    expect(fake.getUserByEmail("vergeten@rkm.test")?.password).toBe("Nieuw-wachtwoord-2");
  });
});

describe("admin allowlist", () => {
  it("lets the owner (ADMIN_EMAIL) in on first login and links the account", async () => {
    const owner = fake.addUser("eigenaar@rkm.test", "Eigenaar-wachtwoord-1");
    const admin = await linkAdminToAuthUser(
      { id: owner.id, email: owner.email, email_confirmed_at: "2026-01-01T00:00:00Z" },
      handle.db,
    );
    expect(admin?.role).toBe("OWNER");
    const [row] = await handle.db.select().from(adminUsers).where(eq(adminUsers.email, owner.email));
    expect(row.authUserId).toBe(owner.id);
  });

  it("re-links the owner when their Supabase account was recreated", async () => {
    const recreated = await linkAdminToAuthUser(
      { id: "7b0c3f9e-5a1d-4c2e-9f8a-1d2e3f4a5b6c", email: "eigenaar@rkm.test", email_confirmed_at: "2026-02-01T00:00:00Z" },
      handle.db,
    );
    expect(recreated?.authUserId).toBe("7b0c3f9e-5a1d-4c2e-9f8a-1d2e3f4a5b6c");
  });

  it("refuses people who are not on the allowlist", async () => {
    const stranger = fake.addUser("vreemde@example.com", "Vreemd-wachtwoord-1");
    const admin = await linkAdminToAuthUser(
      { id: stranger.id, email: stranger.email, email_confirmed_at: "2026-01-01T00:00:00Z" },
      handle.db,
    );
    expect(admin).toBeNull();
  });

  it("does not link on an unverified e-mail address", async () => {
    await handle.db.insert(adminUsers).values({ email: "medewerker@rkm.test", name: "Medewerker" });
    const admin = await linkAdminToAuthUser(
      { id: "2d1c6f3e-2b74-4f43-9a52-3d2b3e8a9f10", email: "medewerker@rkm.test", email_confirmed_at: null },
      handle.db,
    );
    expect(admin).toBeNull();
  });
});

describe("adding administrators (secret key)", () => {
  it("creates a confirmed login and reports existing accounts", async () => {
    const adminClient = createSupabaseAdminClient(config)!;
    const created = await adminClient.auth.admin.createUser({
      email: "nieuw@rkm.test",
      password: "Tijdelijk-wachtwoord-1",
      email_confirm: true,
    });
    expect(created.error).toBeNull();
    expect(created.data.user?.email_confirmed_at).toBeTruthy();

    const duplicate = await adminClient.auth.admin.createUser({ email: "nieuw@rkm.test", password: "x", email_confirm: true });
    expect(duplicate.error?.code).toBe("email_exists");
  });

  it("is not available without the secret key", () => {
    expect(createSupabaseAdminClient({ ...config, secretKey: null })).toBeNull();
  });
});
