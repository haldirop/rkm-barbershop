/**
 * Creates .env.local for working on your own computer: the built-in database (separate
 * from the live site), the local admin login and fresh random secrets.
 * Never overwrites an existing .env.local.
 *
 *   npm run setup:local -- jouw@email.nl
 */
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { passwordProblem } from "../src/server/auth/password";

const target = join(process.cwd(), ".env.local");
const email = process.argv[2]?.trim().toLowerCase();

if (existsSync(target)) {
  console.log("• .env.local bestaat al: er is niets veranderd.");
  process.exit(0);
}
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("✗ Geef je e-mailadres mee, bijvoorbeeld:  npm run setup:local -- jouw@email.nl");
  process.exit(1);
}

const secret = (bytes: number) => randomBytes(bytes).toString("hex");
let password = "";
while (!password || passwordProblem(password)) password = randomBytes(12).toString("base64url");

writeFileSync(
  target,
  `# Lokale instellingen voor deze computer (gemaakt met npm run setup:local).
# Niet delen: dit bestand gaat bewust niet mee naar GitHub.

SITE_URL=http://localhost:3000
APP_SECRET=${secret(32)}

# Ingebouwde database in de map .data, los van de echte site en haar gegevens.
DATABASE_URL=pglite:./.data/pglite

# Beheerder (eigenaar) en het wachtwoord voor de lokale login op /admin.
ADMIN_EMAIL=${email}
ADMIN_PASSWORD=${password}

CRON_SECRET=${secret(16)}
`,
  { mode: 0o600 },
);

console.log(`✓ .env.local aangemaakt.

  Start de site:   npm run dev
  Website:         http://localhost:3000
  Beheer:          http://localhost:3000/admin
  Inloggen met:    ${email}
  Wachtwoord:      ${password}

  Het wachtwoord staat ook in .env.local (ADMIN_PASSWORD).`);
