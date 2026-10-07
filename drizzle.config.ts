import { defineConfig } from "drizzle-kit";

// Only used to generate SQL migrations from src/server/db/schema.ts (`npm run db:generate`).
// Migrations are applied by scripts/setup.ts, which works for both PostgreSQL and PGlite.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
});
