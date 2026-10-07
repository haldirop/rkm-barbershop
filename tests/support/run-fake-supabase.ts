/**
 * Runs the fake Supabase Auth API on http://127.0.0.1:54399 for manual end-to-end
 * testing of the Supabase login without an account:
 *   npx tsx tests/support/run-fake-supabase.ts
 * then start the site with SUPABASE_URL=http://127.0.0.1:54399,
 * SUPABASE_PUBLISHABLE_KEY=sb_publishable_test and SUPABASE_SECRET_KEY=sb_secret_test.
 * Test accounts (fixtures, not real credentials):
 */
import { startFakeSupabaseAuth } from "./fake-supabase-auth";

export const FAKE_ACCOUNTS = {
  owner: { email: process.env.ADMIN_EMAIL ?? "beheer@rkm.test", password: "Test-eigenaar-123" },
  stranger: { email: "geen-beheerder@rkm.test", password: "Test-vreemde-123" },
};

async function main() {
  const fake = await startFakeSupabaseAuth({
    publishableKey: "sb_publishable_test",
    secretKey: "sb_secret_test",
    port: 54399,
  });
  fake.addUser(FAKE_ACCOUNTS.owner.email, FAKE_ACCOUNTS.owner.password);
  fake.addUser(FAKE_ACCOUNTS.stranger.email, FAKE_ACCOUNTS.stranger.password);
  console.log(`Fake Supabase Auth op ${fake.url}`);
}

void main();
